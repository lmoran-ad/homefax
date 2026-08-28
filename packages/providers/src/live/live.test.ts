import { afterEach, describe, expect, it, vi } from "vitest";
import { FixtureParcelProvider } from "../fixture/parcel-provider";
import { FixturePermitProvider } from "../fixture/permit-provider";
import { ArcgisParcelProvider } from "./arcgis-parcel-provider";
import { ArcgisPermitProvider } from "./arcgis-permit-provider";
import { SocrataPermitProvider } from "./socrata-permit-provider";
import {
  DENVER_PERMITS,
  withOverrides,
  type ParcelSource,
  type PermitSource,
} from "./sources";

/**
 * These never touch the network. Every response is a recorded shape, which is
 * the only way to assert on what happens when a portal misbehaves — the
 * interesting cases here are all failure cases, and a live endpoint cannot be
 * asked to fail on cue.
 */

const PARCELS: ParcelSource = {
  id: "test-parcels",
  label: "Test County Assessor",
  url: "https://example.test/ArcGIS/rest/services/PARCELS/FeatureServer/0",
  fields: {
    address: "SITUS_ADDR",
    parcelId: "SCHEDNUM",
    city: "CITY",
    postalCode: "ZIP",
    yearBuilt: "YEAR_BUILT",
    livingSqft: "BLDG_SQFT",
    lotSqft: "LAND_SQFT",
    assessedValue: "TOTAL_VALUE",
  },
  defaults: { city: "Denver", state: "CO", postalCode: "80202" },
};

const PERMITS: PermitSource & { domain: string; dataset: string } = {
  id: "test-permits",
  label: "Test City Permits",
  domain: "data.example.test",
  dataset: "abcd-1234",
  fields: {
    permitNumber: "permit_number",
    issuedAt: "issued_date",
    address: "address_line1",
    scope: "description",
    status: "status",
  },
};

function stubFetch(handler: (url: string) => unknown): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string | URL) => {
      const body = handler(String(url));
      if (body instanceof Error) throw body;
      if (typeof body === "number") {
        return new Response("upstream", { status: body });
      }
      return new Response(JSON.stringify(body), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("the ArcGIS parcel provider", () => {
  it("maps a county row onto a parcel record", async () => {
    stubFetch(() => ({
      features: [
        {
          attributes: {
            SITUS_ADDR: "1600 GLENARM PL",
            SCHEDNUM: "0234500012000",
            CITY: "DENVER",
            ZIP: "80202-1234",
            YEAR_BUILT: 1998,
            BLDG_SQFT: "2,140",
            LAND_SQFT: 4800,
            TOTAL_VALUE: "$612,300",
          },
        },
      ],
    }));

    const provider = new ArcgisParcelProvider(PARCELS, new FixtureParcelProvider());
    const parcel = await provider.findByAddress("1600 Glenarm Pl, Denver");

    expect(parcel).toMatchObject({
      address: "1600 GLENARM PL",
      parcelId: "0234500012000",
      yearBuilt: 1998,
      // Portals encode numbers as decorated strings; they have to survive it.
      livingSqft: 2140,
      estimatedValue: 612300,
      postalCode: "80202",
    });
  });

  it("mints the same token id for the same parcel every time", async () => {
    stubFetch(() => ({
      features: [{ attributes: { SITUS_ADDR: "1600 GLENARM PL", SCHEDNUM: "0234500012000" } }],
    }));
    const provider = new ArcgisParcelProvider(PARCELS, new FixtureParcelProvider());

    const first = await provider.provision("1600 Glenarm Pl");
    const second = await provider.provision("1600 Glenarm Pl");

    expect(first.tokenId).toBe(second.tokenId);
    expect(first.tokenId).toMatch(/^HF-US-CO-DEN-\d{8}$/);
  });

  it("leaves an attribute the county did not publish at zero", async () => {
    stubFetch(() => ({
      features: [{ attributes: { SITUS_ADDR: "9 NOWHERE ST", SCHEDNUM: "1", YEAR_BUILT: 1971 } }],
    }));
    const provider = new ArcgisParcelProvider(PARCELS, new FixtureParcelProvider());

    const parcel = await provider.provision("9 Nowhere St");

    // Inventing a bedroom count would make the record worse, not better.
    expect(parcel.bedrooms).toBe(0);
    expect(parcel.livingSqft).toBe(0);
    expect(parcel.events[0]!.description).toContain("year built");
    expect(parcel.events[0]!.description).not.toContain("bedrooms");
  });

  it("treats an ArcGIS error body as a failure even though it arrives as HTTP 200", async () => {
    // A rejected query — a wrong column name, most often — is reported in the
    // body with a 200 status. Trusting the status would surface it as a parcel
    // that simply does not exist.
    stubFetch(() => ({ error: { code: 400, message: "Invalid field: SITUS_ADDR" } }));
    const provider = new ArcgisParcelProvider(PARCELS, new FixtureParcelProvider());

    await expect(provider.findByAddress("123 Main Street")).resolves.toMatchObject({
      tokenId: "HF-US-CO-DEN-00001234",
    });
  });

  it("falls back to the fixture when the portal is down", async () => {
    stubFetch(() => 503);
    const provider = new ArcgisParcelProvider(PARCELS, new FixtureParcelProvider());

    await expect(provider.findByAddress("123 Main Street")).resolves.toMatchObject({
      address: "123 Main Street",
    });
  });

  it("recovers when the service has renumbered its single layer", async () => {
    // Denver publishes one layer per service at an index that is neither zero
    // nor stable. A renumber otherwise drops the integration back to fixtures
    // silently, and the record quietly stops being real.
    const seen: string[] = [];
    stubFetch((url) => {
      seen.push(url);
      if (url.includes("/FeatureServer/0/query")) {
        return new TypeError("Invalid URL");
      }
      if (url.includes("/FeatureServer?f=json")) {
        return { layers: [{ id: 245, name: "PROP_PARCELS_A" }] };
      }
      return { features: [{ attributes: { SITUS_ADDR: "9 REAL ST", SCHEDNUM: "42" } }] };
    });

    const provider = new ArcgisParcelProvider(PARCELS, new FixtureParcelProvider());
    const parcel = await provider.findByAddress("9 Real St");

    expect(parcel).toMatchObject({ address: "9 REAL ST", parcelId: "42" });
    expect(seen.some((url) => url.includes("/FeatureServer/245/query"))).toBe(true);
  });

  it("does not guess a layer when the service publishes several", async () => {
    stubFetch((url) => {
      if (url.includes("/query")) return new TypeError("Invalid URL");
      return {
        layers: [
          { id: 1, name: "PARCELS" },
          { id: 2, name: "PARCEL_POINTS" },
        ],
      };
    });

    const provider = new ArcgisParcelProvider(PARCELS, new FixtureParcelProvider());

    // Ambiguous, so it falls back rather than picking one and being confidently
    // wrong about which house a record describes.
    await expect(provider.findByAddress("123 Main Street")).resolves.toMatchObject({
      tokenId: "HF-US-CO-DEN-00001234",
    });
  });

  it("does not let an address close a quote in the where clause", async () => {
    const seen: string[] = [];
    stubFetch((url) => {
      seen.push(url);
      return { features: [] };
    });
    const provider = new ArcgisParcelProvider(PARCELS, new FixtureParcelProvider());

    await provider.findByAddress("123 Main' OR '1'='1");

    const where = new URL(seen[0]!).searchParams.get("where") ?? "";
    expect(where).not.toMatch(/'\s*OR\s*'/i);
  });
});

describe("the Socrata permit provider", () => {
  it("maps permit rows and orders them oldest first", async () => {
    stubFetch(() => [
      {
        permit_number: "2024-BLD-0099",
        issued_date: "2024-07-02T00:00:00.000",
        address_line1: "1600 GLENARM PL",
        description: "Reroof, asphalt shingle",
        status: "Finaled",
      },
      {
        permit_number: "2019-BLD-0042",
        issued_date: "2019-03-14T00:00:00.000",
        address_line1: "1600 GLENARM PL",
        description: "Furnace replacement",
        status: "Issued",
      },
    ]);

    const provider = new SocrataPermitProvider(PERMITS, new FixturePermitProvider());
    const permits = await provider.getPermitHistory({
      parcelId: "0234500012000",
      address: "1600 Glenarm Pl, Denver",
    });

    expect(permits.map((p) => p.permitNumber)).toEqual([
      "2019-BLD-0042",
      "2024-BLD-0099",
    ]);
    expect(permits[0]).toMatchObject({ issuedAt: "2019-03-14", status: "ISSUED" });
    expect(permits[1]!.status).toBe("FINALED");
  });

  it("drops a row with no date or number rather than showing a blank permit", async () => {
    stubFetch(() => [
      { permit_number: "", issued_date: "2024-01-01", address_line1: "X" },
      { permit_number: "2024-BLD-1", issued_date: "", address_line1: "X" },
    ]);
    const provider = new SocrataPermitProvider(PERMITS, new FixturePermitProvider());

    await expect(
      provider.getPermitHistory({ parcelId: "p", address: "1 X St" }),
    ).resolves.toEqual([]);
  });

  it("reports no permits as an empty history, not as a failure", async () => {
    // Plenty of houses have never had a permit pulled. Falling back to the
    // fixture here would invent history for a real address.
    stubFetch(() => []);
    const provider = new SocrataPermitProvider(PERMITS, new FixturePermitProvider());

    await expect(
      provider.getPermitHistory({
        parcelId: "DEN-1234-567-89",
        address: "123 Main Street",
      }),
    ).resolves.toEqual([]);
  });

  it("falls back to the fixture when the portal cannot be read", async () => {
    stubFetch(() => 500);
    const provider = new SocrataPermitProvider(PERMITS, new FixturePermitProvider());

    const permits = await provider.getPermitHistory({
      parcelId: "DEN-1234-567-89",
      address: "123 Main Street",
    });
    expect(permits.length).toBeGreaterThan(0);
  });
});

describe("the ArcGIS permit provider", () => {
  const ARCGIS_PERMITS: PermitSource & { arcgisUrl: string } = {
    id: "test-arcgis-permits",
    label: "Test City Permits",
    arcgisUrl: "https://example.test/ArcGIS/rest/services/PERMITS/FeatureServer/0",
    fields: {
      permitNumber: "PERMIT_NUM",
      issuedAt: "ISSUED_DATE",
      address: "ADDRESS",
      scope: "WORK_DESC",
      status: "STATUS",
    },
  };

  it("reads Esri epoch-millisecond dates", async () => {
    // Esri encodes dates as epoch milliseconds, not ISO strings. Reading one
    // as a string yields an invalid date and drops the permit silently.
    stubFetch(() => ({
      features: [
        {
          attributes: {
            PERMIT_NUM: "2021-BLD-7",
            ISSUED_DATE: Date.UTC(2021, 4, 17),
            ADDRESS: "1600 GLENARM PL",
            WORK_DESC: "Water heater replacement",
            STATUS: "Final",
          },
        },
      ],
    }));

    const provider = new ArcgisPermitProvider(
      ARCGIS_PERMITS,
      new FixturePermitProvider(),
    );
    const permits = await provider.getPermitHistory({
      parcelId: "x",
      address: "1600 Glenarm Pl",
    });

    expect(permits).toEqual([
      {
        permitNumber: "2021-BLD-7",
        issuedAt: "2021-05-17",
        scope: "Water heater replacement",
        status: "FINALED",
        // This descriptor maps neither, so neither is guessed at.
        contractor: null,
        valuation: null,
        finaledAt: null,
      },
    ]);
  });

  it("keeps the contractor, the valuation and the completion date", async () => {
    // These are the columns that make a permit worth reading: a third party,
    // on the record, saying who did the work and what it was worth.
    stubFetch(() => ({
      features: [
        {
          attributes: {
            PERMIT_NUM: "2012-RESCON-0000004625",
            DATE_ISSUED: Date.UTC(2012, 10, 15),
            ADDRESS: "3729 N LIPAN ST",
            CLASS: "NEW BUILDING",
            FINAL_DATE: Date.UTC(2013, 0, 4),
            CONTRACTOR_NAME: "BUDGET GARAGES & CONSTRUCTION CO INC",
            VALUATION: 14285,
          },
        },
      ],
    }));

    const provider = new ArcgisPermitProvider(
      { ...ARCGIS_PERMITS, fields: DENVER_PERMITS.fields, arcgisUrl: ARCGIS_PERMITS.arcgisUrl },
      new FixturePermitProvider(),
    );
    const [permit] = await provider.getPermitHistory({
      parcelId: "0228105015000",
      address: "3729 N Lipan St",
    });

    expect(permit).toEqual({
      permitNumber: "2012-RESCON-0000004625",
      issuedAt: "2012-11-15",
      scope: "NEW BUILDING",
      status: "FINALED",
      contractor: "BUDGET GARAGES & CONSTRUCTION CO INC",
      valuation: 14285,
      finaledAt: "2013-01-04",
    });
  });

  it("falls back when the layer rejects the query", async () => {
    stubFetch(() => ({ error: { message: "Invalid field: ADDRESS" } }));
    const provider = new ArcgisPermitProvider(
      ARCGIS_PERMITS,
      new FixturePermitProvider(),
    );

    const permits = await provider.getPermitHistory({
      parcelId: "DEN-1234-567-89",
      address: "123 Main Street",
    });
    expect(permits.length).toBeGreaterThan(0);
  });
});

describe("source overrides", () => {
  it("replaces the endpoint and merges field names", () => {
    const { source, problems } = withOverrides(PARCELS, "PARCEL_SOURCE", {
      PARCEL_SOURCE_URL: "https://other.test/FeatureServer/2",
      PARCEL_SOURCE_FIELDS: '{"address":"SITE_ADDR"}',
    } as NodeJS.ProcessEnv);

    expect(problems).toEqual([]);
    expect(source.url).toBe("https://other.test/FeatureServer/2");
    expect(source.fields.address).toBe("SITE_ADDR");
    // A partial override must not wipe the fields it did not mention.
    expect(source.fields.parcelId).toBe("SCHEDNUM");
  });

  it("ignores a malformed override instead of taking the deployment down", () => {
    const { source, problems } = withOverrides(PARCELS, "PARCEL_SOURCE", {
      PARCEL_SOURCE_FIELDS: "{not json",
    } as NodeJS.ProcessEnv);

    expect(source.fields.address).toBe("SITUS_ADDR");
    expect(problems[0]).toContain("not valid JSON");
  });

  it("switches a permit source to ArcGIS when pointed at a FeatureServer", () => {
    // Whether a jurisdiction publishes permits on an open-data portal or as an
    // Esri layer is not knowable in advance, so it has to be correctable
    // without a code change.
    const { source } = withOverrides(PERMITS, "PERMIT_SOURCE", {
      PERMIT_SOURCE_URL: "https://city.test/FeatureServer/3",
    } as NodeJS.ProcessEnv);

    expect(source.arcgisUrl).toBe("https://city.test/FeatureServer/3");
  });

  it("leaves the descriptor untouched", () => {
    withOverrides(PARCELS, "PARCEL_SOURCE", {
      PARCEL_SOURCE_FIELDS: '{"address":"CHANGED"}',
    } as NodeJS.ProcessEnv);
    expect(PARCELS.fields.address).toBe("SITUS_ADDR");
  });
});
