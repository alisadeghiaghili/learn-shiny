# Curriculum schema

One JSON document per track/language bundle. Hosts must treat this as the
only lesson source of truth.

## Bundle shape

```json
{
  "lang": "r",
  "levels": [Level]
}
```

`lang` is `"r"` or `"python"`. Concept levels may also appear under
`shared/concept-shared.json` when prose is identical and only `starterCode` /
`solution` diverge.

## Level shape

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Unique, stable (`c-01-two-halves`, `code-03-plot`) |
| `track` | `"concept"` \| `"code"` | |
| `title` | string | Short, sentence case |
| `goal` | string | One outcome, imperative |
| `body` | string | Markdown-lite paragraphs (newline separated) |
| `hint` | string | Shown after learner asks |
| `par` | integer | Golf par (minimum useful commands / checks) |
| `startGraph` | Graph | Initial reactive graph |
| `targetGraph` | Graph | Required shape for concept levels (may be partial) |
| `starterCode` | string | Code-track scaffold |
| `checks` | Check[] | All must pass |
| `solution` | string | Reference solution (revealed on demand) |
| `sample` | string? | Optional concept-track code sample |

## Graph

```json
{
  "nodes": [{ "id": "x", "kind": "input", "label": "x" }],
  "edges": [{ "from": "x", "to": "y" }]
}
```

`kind`: `input` | `reactive` | `observer` | `output` | `module`

## Check

| `type` | `value` | Passes when |
|--------|---------|-------------|
| `contains` | string | Normalized code contains substring |
| `regex` | pattern | Pattern matches (multiline) |
| `notContains` | string | Substring is absent |
| `graphHasNode` | `{id,kind?}` | Node present (optionally same kind) |
| `graphHasEdge` | `{from,to}` | Directed edge present |
| `graphMatch` | Graph | All listed nodes/edges exist |

Concept levels usually use `graphMatch` / `graphHas*`.
Code levels use `contains` / `regex` / `notContains`.
