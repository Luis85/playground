# Radzen Blazor MCP — Improvement Research & Roadmap

**Date:** 2026-06-22
**Method:** deep-research harness (5 parallel search angles → fetch → verify → synthesize).
**Subject:** how to improve our local Radzen Blazor MCP, informed by the official
Radzen Blazor MCP and broad product/engineering practice.

---

## 1. The official Radzen Blazor MCP vs ours

**Official** ([radzen.com/blazor-mcp](https://www.radzen.com/blazor-mcp), [setup](https://www.radzen.com/blazor-mcp/documentation/setup), [blazor.radzen.com/ai](https://blazor.radzen.com/ai)):
- **One tool, `search`** — natural-language query → markdown (component APIs + code samples + step-by-step instructions).
- **Semantic doc search** over the *complete, always-current* docs (110+ components, every property/event/enum/binding); matches best on exact component names.
- **Templates** for CRUD pages, master-detail, dashboards, forms-with-validation, scheduler, dialog/wizard flows (exact inventory partially unverified).
- **Transport:** Streamable HTTP at `https://app.radzen.com/mcp`, auth header `X-Radzen-Key`. No local install.
- **Pricing:** free trial 50 requests / 15 days; then Pro **$799/yr** or Team **$1,999/yr**.
- **Positioning:** beats training-cutoff staleness with live docs.

**Ours (v1):** 4 structured tools (`list_components`, `get_component`, `search_components`, `scaffold_component`), offline, free, reflection-accurate (215 component types with `[Parameter]`/`EventCallback`), deterministic scaffolding, version-pinned & reproducible.

**Honest comparison**

| Dimension | Official | Ours |
|---|---|---|
| Cost | $799–1,999/yr after 50-req trial | Free |
| Network/auth | Cloud, API key, rate-limited | Offline, no key, no limits, private |
| API accuracy | Doc-derived | **Reflection = authoritative, can't drift** |
| Usage examples | ✅ code samples | ❌ none |
| Semantic search | ✅ | ❌ substring only |
| Templates (CRUD/dashboard/form) | ✅ | ❌ single-tag scaffold |
| Structural/composition knowledge | ✅ (in docs) | ❌ |
| Reproducible/pinned to a version | ✗ (live) | ✅ |

**Strategic read:** we will not out-corpus their hosted semantic doc search. Our durable edge is **authoritative offline API truth + deterministic scaffolding + zero cost/keys**. The biggest correctness gap to close is the *usage knowledge* reflection cannot see (binding conventions, setup, structural patterns).

---

## 2. Patterns worth borrowing (other component/docs MCPs)

- **shadcn `registry-item.json`** — a machine-readable component manifest (files+paths, npm + transitive deps, `cssVars`, install `docs`, free-form `meta`) the agent resolves deterministically. ([registry-item](https://ui.shadcn.com/docs/registry/registry-item-json), [mcp](https://ui.shadcn.com/docs/mcp)) → model for enriching our per-component records with examples + setup + deps.
- **Nx MCP schema-first scaffolding** — `nx_generators` (list) → `nx_generator_schema` (option schema) → `nx_run_generator` opens a **prefilled** review UI; a deterministic generator (not the LLM) emits code. ([nx.dev/docs/reference/nx-mcp](https://nx.dev/docs/reference/nx-mcp)) → model for richer `scaffold_*` tools.
- **Context7** — `resolve-library-id` + `get-library-docs(topic, tokens)`; moved filtering/reranking **server-side** with a token budget → **65% fewer context tokens, 38% lower latency, 30% fewer tool calls**. ([upstash.com/blog/new-context7](https://upstash.com/blog/new-context7)) → retrieve+rank on server; expose a `tokens`/`response_format` knob.
- **MUI `@mui/mcp`** — local stdio via `npx -y @mui/mcp@latest`; `useMuiDocs` → `fetchDocs` loop; anti-hallucination stance (quote real sources). ([mui.com/.../mcp](https://mui.com/material-ui/getting-started/mcp/))
- **GitMCP / llms.txt** — `fetch_documentation` + token-cheap `search_documentation`, llms.txt fallback chain. ([git-mcp](https://github.com/idosal/git-mcp), [llmstxt.org](https://llmstxt.org/))
- **v0/design-systems** — "a registry is a distribution spec to pass design-system context to AI models." ([v0.app/docs/design-systems](https://v0.app/docs/design-systems))

---

## 3. MCP tool-design & agent-usability best practices

From Anthropic [writing-tools-for-agents](https://www.anthropic.com/engineering/writing-tools-for-agents), the [MCP tools spec](https://modelcontextprotocol.io/specification/2025-06-18/server/tools), and [code-execution-with-mcp](https://www.anthropic.com/engineering/code-execution-with-mcp):

- **Descriptions = onboarding a new hire**: say *when* to use each tool; small description tweaks yield large gains.
- **Unambiguous params** (`component_id` not `component`), **flat schemas**, every property described, `snake_case`.
- **Few high-leverage tools**, not thin wrappers; overlapping tools distract.
- **Token efficiency**: return only needed fields; add a `response_format` (`concise`/`detailed`, ~⅓ tokens); paginate/filter/truncate with helpful steering on truncation. (Claude Code caps tool responses ≈25k tokens.)
- **Anti-hallucination**: return authoritative retrieved signatures/examples (system-of-record), human-readable identifiers, `outputSchema` + `structuredContent`, and "did you mean" on misses.
- **Resources vs tools vs prompts**: model-driven → tool; app-context → resource; user-invoked → prompt. **Most clients support only tools** — keep tools primary, optionally emit `resource_link`s. ([pulsemcp client gap](https://www.pulsemcp.com/posts/mcp-client-capabilities-gap))
- **Evaluate** with realistic multi-call tasks in agentic loops; track accuracy, tool-call count, tokens, errors.

---

## 4. High-value Radzen knowledge our reflection-only KB misses

(All from blazor.radzen.com docs.)
- **`@bind-Value` is the universal two-way binding name** for every input regardless of value type; companion `Change` event. ([textbox](https://blazor.radzen.com/textbox))
- **Setup**: `<RadzenTheme Theme="material"/>`, `builder.Services.AddRadzenComponents()` (registers Dialog/Notification/Tooltip/ContextMenu services), `Radzen.Blazor.js`, and `<RadzenComponents @rendermode=...>` — **interactive features silently fail without the right rendermode**. ([get-started](https://blazor.radzen.com/get-started))
- **Validation**: `RadzenTemplateForm` + validators linked by **`Name`(input) ↔ `Component`(validator)**; `DefaultValue`/positioning gotchas. ([templateform](https://blazor.radzen.com/docs/guides/components/templateform.html))
- **DataGrid `LoadData` + `Count` + Dynamic-LINQ string** server-side paging/sorting/filtering pattern; `<Columns>`/`<Template>` child content. ([datagrid-loaddata](https://blazor.radzen.com/datagrid-loaddata))
- **Event wiring** via lambdas passing args: `Click=@(args => OnClick("save"))`. ([button](https://blazor.radzen.com/button))
- **Layout composition trees**: `RadzenLayout`>`RadzenHeader`/`RadzenSidebar @bind-Expanded`(+`RadzenPanelMenu`)/`RadzenBody`; content via `RadzenStack`/`RadzenRow`/`RadzenColumn`/`RadzenCard`. ([layout](https://blazor.radzen.com/layout))
- **Icons**: `<RadzenIcon Icon="dashboard"/>` Material Symbols; reused as `Icon=` on buttons/menus. ([icon](https://blazor.radzen.com/icon))
- **Services**: `@inject DialogService`, `OpenAsync<T>()`/`Confirm`/`Alert`, `NotificationService.Notify(...)`. ([dialog](https://blazor.radzen.com/dialog))

These are structural/relational patterns — not inferable from parameter names — and are exactly what makes generated Radzen code compile.

---

## 5. Distribution & DX

- **npm + `npx` zero-install**: `bin` + `#!/usr/bin/env node` shebang (we have both); clients run `npx -y <pkg>`. ([mcp registry quickstart](https://modelcontextprotocol.io/registry/quickstart))
- **Config**: Claude Code `claude mcp add` with `--scope project` writes a committable `.mcp.json`; VS Code `.vscode/mcp.json` + `vscode:mcp/install` URLs; Cursor deeplinks + install badges. ([claude code mcp](https://code.claude.com/docs/en/mcp), [vscode](https://code.visualstudio.com/docs/agent-customization/mcp-servers), [cursor](https://cursor.com/docs/context/mcp/install-links))
- **MCP registry** (preview, `registry.modelcontextprotocol.io`, `server.json`, `mcp-publisher`) — publish once registered on npm; needs `mcpName` in package.json. ([quickstart](https://modelcontextprotocol.io/registry/quickstart))
- **Keep KB fresh**: Renovate/Dependabot watch the `Radzen.Blazor` NuGet package and open a PR on new releases → our CI regenerates; gate a drift check. ([renovate](https://docs.renovatebot.com/), [dependabot/NuGet])
- **Offline search options**: `Fuse.js` (zero-dep fuzzy, lexical) as a quick upgrade; `sqlite-vec` (zero-dep, single-file, brute-force KNN — fine for ~hundreds of components) for true offline semantic search without an API key. ([fusejs](https://www.fusejs.io/), [sqlite-vec](https://github.com/asg017/sqlite-vec))
- **.NET tool** alternative (`PackAsTool`) exists but adds an SDK dependency vs our zero-dep committed JSON — keep JSON as the shipping artifact. ([dotnet global tools](https://learn.microsoft.com/en-us/dotnet/core/tools/global-tools-how-to-create))

---

## 6. Prioritized roadmap (impact × effort)

### ✅ Already done this session (review-driven, on-roadmap)
- `scaffold_component` accepts **event callbacks** + **HTML-escapes** values.
- **Pinned** `Radzen.Blazor` 5.9.9 → reproducible KB.

### Quick wins (high impact / low effort)
1. **Tool-description & schema polish** — per-param descriptions, "when to use", `response_format: concise|detailed`. Reduces misuse/hallucination cheaply. (Anthropic)
2. **"Did you mean" on misses** — fuzzy-nearest names in `get_component`/`scaffold_component` errors.
3. **Fuzzy search (Fuse.js)** — replace pure substring; weight name > param > description.
4. **npm publish + `npx` + committable `.mcp.json` snippet + install badges** — big DX, small work (shebang/bin already done).
5. **Renovate/Dependabot on `Radzen.Blazor`** — auto-PR + CI regen on Radzen releases.

### Medium (highest correctness payoff)
6. **Enrich the KB with usage knowledge** (§4): per-component `examples` + a curated `setup`/`patterns` corpus (binding, validation Name↔Component, DataGrid LoadData, theming/services, layout trees). Source by scraping blazor.radzen.com examples in the extractor. **This is the #1 gap vs the official MCP.**
7. **New retrieval tool** `get_usage(topic)` / `get_setup()` returning those curated snippets; add `outputSchema`/`structuredContent`.
8. **Schema-first template scaffolding** (Nx pattern): `scaffold_form`, `scaffold_datagrid`, `scaffold_layout` that emit multi-element, child-content markup from an option schema.

### Larger bets
9. **Offline semantic search** via small embeddings + `sqlite-vec` over descriptions+examples, server-side ranked with a `tokens` budget (Context7 pattern).
10. **Eval harness** — agentic loop checking generated Radzen markup compiles; track tool-calls/tokens/errors to tune tools (Anthropic eval guidance).
11. **Template library** (CRUD/dashboard/master-detail) to reach feature parity with the official templates, as deterministic generators.

**Recommended next step:** items 1–4 in one pass (cheap, compounding), then commit to **#6 (usage-knowledge enrichment)** as the flagship — it directly attacks the one thing the paid cloud MCP does that we don't, while keeping our offline/free/authoritative edge.

---

### Verification notes
- Official MCP exposes a single `search` tool: corroborated by the product page, setup docs, and PulseMCP listing.
- Exact official **template inventory** and any **rate limits beyond the 50-request trial** are **unverified** (not documented on reviewed pages).
- A `Radzen.Mcp` NuGet package (v0.0.4) exists but its relation to the hosted server is **unverified**.
