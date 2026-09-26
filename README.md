# LearnShiny

Interactive Shiny tutorial and sandbox, inspired by
[learnGitBranching](https://github.com/pcottle/learnGitBranching).

**Live demo:** https://alisadeghiaghili.github.io/learn-shiny/

Pick **R** or **Python**. Work two parallel tracks:

1. **Concept** — the reactive model as a living graph (UI / input / reactive / output)
2. **Code** — write real Shiny app fragments and check them against clear rules

Plus a free **sandbox** with undo, reset, golf scoring, and export to `app.R` / `app.py`.

## Repository layout

| Path         | Role                                                                 |
|--------------|----------------------------------------------------------------------|
| `curriculum/` | Shared level data (source of truth for every host)                 |
| `web/`       | Primary SPA learning surface                                         |
| `apps/python/` | Thin Shiny for Python host over the same curriculum               |
| `apps/r/`    | Thin R Shiny host over the same curriculum                           |
| `DESIGN.md`  | Visual system and product decisions                                  |

## Run the SPA

Open `web/index.html` via any static server from the repo root (ES modules):

```bash
python -m http.server 5173
# → http://localhost:5173/web/
```

## Run the Shiny hosts

Python (from `apps/python`):

```bash
pip install shiny
shiny run --reload app.py
```

R (from `apps/r`):

```r
shiny::runApp()
```

## Curriculum contract

See `curriculum/schema.md`. Adding a level means adding JSON only —
every host picks it up without copy-paste.

## Design

See [DESIGN.md](./DESIGN.md).
