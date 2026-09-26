# Thin R Shiny host over the shared LearnShiny curriculum.
# Content browser only — the SPA in ../../web is the full sandbox.

library(shiny)
library(jsonlite)

curriculum_root <- local({
  candidates <- c(
    file.path("..", "..", "curriculum", "r"),
    file.path("curriculum", "r"),
    file.path(dirname(getwd()), "curriculum", "r")
  )
  for (path in candidates) {
    if (dir.exists(path)) return(normalizePath(path))
  }
  stop("Cannot find curriculum/r. Run from apps/r or the repo root.")
})

load_levels <- function(track) {
  path <- file.path(curriculum_root, paste0(track, ".json"))
  data <- jsonlite::fromJSON(path, simplifyVector = FALSE)
  data$levels
}

concept_levels <- load_levels("concept")
code_levels <- load_levels("code")

level_panel <- function(level) {
  sample <- level$sample
  if (is.null(sample) || !nzchar(sample)) sample <- level$solution
  tags$div(
    h3(paste(level$id, "·", level$title)),
    p(level$goal),
    p(gsub("\n", " ", level$body)),
    h5("Hint"),
    p(level$hint),
    h5("Sample"),
    tags$pre(sample),
    h5("Par"),
    p(level$par),
    class = "level-card",
    style = "border:1px solid #ccc; border-radius:8px; padding:16px; margin:12px 0; max-width:70ch;"
  )
}

ui <- fluidPage(
  tags$style("body { font-family: system-ui, sans-serif; }"),
  titlePanel("LearnShiny — R track"),
  p("Concept then code. Full sandbox lives in the web/ SPA."),
  radioButtons(
    "track",
    "Track",
    choices = c(Concept = "concept", Code = "code"),
    selected = "concept"
  ),
  uiOutput("levels")
)

server <- function(input, output, session) {
  output$levels <- renderUI({
    levels_list <- if (identical(input$track, "concept")) concept_levels else code_levels
    do.call(tagList, lapply(levels_list, level_panel))
  })
}

shinyApp(ui, server)
