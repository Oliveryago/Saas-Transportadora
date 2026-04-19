# Feature: Fuel Updates

## Objective
Support backdated fuel logging via a `date` specifier, integrate Arla 32 directly into Diesel receipts protecting the general performance metric (KM/L), and fix all BRL formatting across the module.

## Core Rules
- `arla_liters` MUST NOT be calculated into the `kilometers_driven / liters` performance module. 
- The `value_brl` variable submitted will be the total invoice value: `(diesel_liters * price) + (arla_liters * price)`.
- If `date` is missing from legacy entries, the application should fallback to `created_at`.

## Modules affected
- `/fuel` (table, formatting)
- `FuelModal` (inputs for Date and Arla)
- Supabase `fuel_records`

## Related
- [Project Intent](project-intent.md)
- [Decision: Fuel Updates](../decisions/006-fuel-updates.md)
