"""Thin Shiny for Python host over the shared LearnShiny curriculum.

This is intentionally a content browser, not a second lesson engine.
The SPA in ../../web is the full LGB-style sandbox.
"""

from __future__ import annotations

import json
from pathlib import Path

from shiny import App, reactive, render, ui

CURRICULUM_ROOT = Path(__file__).resolve().parents[2] / "curriculum" / "python"


def load_levels(track: str) -> list[dict]:
    """Load level objects for one track.

    Args:
        track: "concept" or "code".

    Returns:
        List of level dicts from curriculum JSON.

    Raises:
        FileNotFoundError: If the curriculum bundle is missing.
    """
    path = CURRICULUM_ROOT / f"{track}.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    return data["levels"]


def level_panel(level: dict) -> ui.Tag:
    """Render one level as a readable card.

    Args:
        level: Level dict from the curriculum schema.

    Returns:
        A Shiny UI tag tree.
    """
    sample = level.get("sample") or level.get("solution") or ""
    return ui.div(
        ui.h3(f"{level['id']} · {level['title']}"),
        ui.p(level["goal"]),
        ui.p(level["body"].replace("\n", " ")),
        ui.h5("Hint"),
        ui.p(level["hint"]),
        ui.h5("Sample"),
        ui.pre(sample),
        ui.h5("Par"),
        ui.p(str(level["par"])),
        class_="level-card",
        style="border:1px solid #ccc; border-radius:8px; padding:16px; margin:12px 0;",
    )


concept_levels = load_levels("concept")
code_levels = load_levels("code")

app_ui = ui.page_fluid(
    ui.tags.style(
        """
        body { font-family: system-ui, sans-serif; }
        .level-card { max-width: 70ch; }
        """
    ),
    ui.h1("LearnShiny — Python track"),
    ui.p(
        "Concept then code. Full sandbox lives in the web/ SPA. "
        "This host keeps you inside Shiny while you study Shiny."
    ),
    ui.input_radio_buttons(
        "track",
        "Track",
        choices={"concept": "Concept", "code": "Code"},
        selected="concept",
    ),
    ui.output_ui("levels"),
)


def server(input, output, session):
    @output
    @render.ui
    def levels():
        track = input.track()
        levels_list = concept_levels if track == "concept" else code_levels
        return ui.div(*[level_panel(level) for level in levels_list])


app = App(app_ui, server)
