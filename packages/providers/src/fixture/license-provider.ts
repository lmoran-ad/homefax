import { fixtureContractors } from "@hometoken/db/fixtures";
import type {
  LicenseProvider,
  LicenseVerification,
} from "../contracts/types.js";

export class FixtureLicenseProvider implements LicenseProvider {
  /**
   * Verified for the seeded licenses, unverified for Mile High Landscape,
   * whose license is not on file. That one failure keeps the UNVERIFIED badge
   * and the OWNER_REPORTED downgrade on submissions testable.
   */
  async verify(input: {
    licenseNumber: string;
    trade: string;
  }): Promise<LicenseVerification> {
    const number = input.licenseNumber.trim();
    const match = fixtureContractors.find(
      (c) => c.license.toLowerCase() === number.toLowerCase(),
    );

    if (!match || !match.verified) {
      return {
        verified: false,
        licenseNumber: number,
        trade: input.trade,
        reason: match
          ? "License number is not on file with the state board."
          : "No matching license found for that number.",
      };
    }

    return {
      verified: true,
      licenseNumber: number,
      trade: match.trade,
      reason: null,
    };
  }
}
