---
title: Extractor default value limitations
type: issue
status: accepted
category: limitation
area: extractor
priority: low
created: 2026-06-23
tags: [radzen-mcp, issue, extractor, defaults]
---

# Extractor default value limitations

**Status:** accepted (known limitations) · **Area:** extractor · **Priority:** low

Three small, deliberate gaps in how the extractor records parameter `default`
values. All are low impact and were accepted during the review pass.

## 1. Constrained generics → null defaults

Open generic components are closed with `MakeGenericType(typeof(object))` to read
defaults. If a future Radzen generic adds a constraint that `object` violates
(`where T : struct`/`notnull`/self-referential), `MakeGenericType` throws, is
caught, and that component's parameters all get `null` defaults silently. None of
the current 45 generic components are affected.

**Possible fix:** on failure, retry with `typeof(int)`/`typeof(string)` per the
constraint, or log a warning so the silent case is visible.

## 2. `Culture` serializes as null

`Culture` (`CultureInfo`) reads `null` on ~114 components because its backing
field is null until `OnInitialized` runs; the effective default is
`CultureInfo.CurrentCulture`. The emitted `null` is technically the field value
but mildly misleading.

**Possible fix:** special-case known lazy-getter params, or leave as-is
(documented here).

## 3. Excluded scalar default types

`StableDefault` only emits primitives/enum/string/bool/numeric/char to keep the
KB deterministic and churn-free. Types like `Guid`, `DateOnly`, `TimeOnly`,
`TimeSpan`, `DateTime` deliberately emit `null`. For these the default is almost
always `default(T)` and stable, so excluding them is conservative; if a
meaningful non-default of such a type ever appears it would be lost.

**Possible fix:** allow a curated set of stable value types (e.g. `Guid`,
`TimeSpan`) if a real need appears.

## References

- `extractor/Program.cs` (`StableDefault`, generic instantiation).
- Reviewer notes (P3) from the review pass.

## Related

back to [[Issues]]
