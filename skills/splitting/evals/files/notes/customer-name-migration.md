# Customer name: decisions

The live `orders` table has a `customer_name` column holding the full name. We will replace it with `first_name` and `last_name`.

- The billing service, deployed separately, reads `customer_name` directly and cannot be released at the same time as this repo.
- Existing rows must be migrated. Everything before the first space is the first name.
- There must be no downtime.
