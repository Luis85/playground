# Reflect the Radzen.Blazor assembly instead of scraping the docs site

We derive the component knowledge base by reflecting the compiled `Radzen.Blazor`
assembly (reading `[Parameter]` properties and `EventCallback`s via .NET
reflection) rather than scraping `blazor.radzen.com` or parsing `.razor`/`.cs`
source. Reflection gives the authoritative, complete API surface — including
inherited members and exact types — and stays correct across Radzen releases,
whereas HTML scraping is fragile and source parsing misses runtime/inherited
detail.

## Considered Options

- **Scrape the docs site** — best for human-written usage examples, but the HTML
  is unstable and incomplete on the full API. Rejected for v1; may be added later
  purely to enrich examples.
- **Parse source statically** — no .NET needed, but brittle and misses inherited
  members.

## Consequences

- Generating the knowledge base requires the .NET SDK and the `Radzen.Blazor`
  package. This is isolated to the extractor; the running MCP server reads only
  the committed JSON and has no .NET dependency.
- The knowledge base has no usage examples in v1 (reflection yields API shape,
  not examples). Revisit if scaffolding quality needs them.
- The `Radzen.Blazor` package ships no XML documentation alongside the assembly,
  so component/parameter `summary`/`description` fields are **empty** in the
  generated knowledge base. The extractor does a best-effort probe for XML docs
  and logs the populated-summary count. Tools and the README state that these
  fields may be empty; search still matches component and parameter names.
  Populating real summaries/examples (by sourcing `blazor.radzen.com` docs) is
  tracked as the flagship follow-up in the research report.
