# @homefax/fixtures

The demo dataset: ten properties, the showcase record's full history, the
contractor directory, the three demo accounts, and the documents Add Record and
the contractor submission flow offer.

It is a package of its own rather than part of `@homefax/db` because two very
different consumers need the same data and neither should have to reach through
the other:

- `@homefax/db` seeds it into PostgreSQL.
- `@homefax/providers` answers parcel, MLS, permit, deed and license lookups
  from it, standing in for the county and MLS integrations a real deployment
  would call.

When the fixtures lived inside the database package those two depended on each
other, and a dependency cycle is not something a build tool will run.

Nothing here imports anything but `@homefax/contracts`, which is what keeps it a
leaf.
