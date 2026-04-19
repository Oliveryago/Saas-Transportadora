# Decision: Fuel Updates (Dynamic Date & Arla Integration)

## Context
Operators occasionally delay entering fuel receipts into the application, causing records to mistakenly sync to the `.created_at` timestamp. Additionally, many diesel trucks consume Arla 32 simultaneously, creating a composite billing that needs separation to track true fuel efficiency (KM/L for Diesel). Furthermore, formatting UI elements for financial items lacked standard pt-BR formatting, resulting in confusing values like R$2000,23 instead of R$ 2.000,23.

## Decision
- Add `date` `(date)` column to `fuel_records` to override logical date sorting without messing with `created_at` server timestamp.
- Add `arla_liters` `(numeric)` and `arla_price_per_liter` `(numeric)` directly to the `fuel_records` table avoiding complex secondary relationships simply for composite fuels.
- Update global format parsers on the front-end to enforce `toLocaleString('pt-BR')`.

## Rationale
Using a single table with Arla metrics keeps reporting simple and ensures atomicity when a user uploads a single physical receipt that has both items.

## Alternatives Considered
- Creating an `Items` associative table: Discarded as unnecessary over-engineering and would break the current analytical dashboard queries for simple users.

## Related
- [Project Intent](../intent/project-intent.md)
- [Feature: Fuel Updates](../intent/feature-fuel-updates.md)

## Status
Approved
