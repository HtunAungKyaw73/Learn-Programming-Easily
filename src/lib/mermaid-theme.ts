// Pure mapping from the site's palette to Mermaid's `base` theme variables.
// The <Mermaid> component reads the palette from the live CSS variables and
// passes it here, so the colours are defined once, in globals.css.

/** The site colours a diagram uses, as hex strings (Mermaid's `base` theme
 *  only understands hex). Names match the CSS variables without the `--`. */
export interface SitePalette {
  paper: string;
  surface: string;
  ink: string;
  muted: string;
  border: string;
  terracotta: string;
  gold: string;
}

/**
 * gitGraph branch colours and their label text. Mermaid cycles through eight
 * slots; the site has four colours that read as distinct, so they repeat.
 *
 * These must be set explicitly. Left to itself, Mermaid's `base` theme derives
 * branch colours from the node fill — near-white here — and darkens them,
 * which gave pale yellow lines on the cream page. Values passed in are drawn
 * exactly as given (that darkening only applies to colours Mermaid derives).
 */
function gitBranchVariables(p: SitePalette, dark: boolean): Record<string, string> {
  // Whichever of ink/paper is the dark one in this theme: text for light fills.
  const darkText = dark ? p.paper : p.ink;
  const branches = [
    { fill: p.terracotta, label: p.paper }, // main
    { fill: p.gold, label: darkText },
    { fill: p.muted, label: p.paper },
    { fill: p.ink, label: p.paper },
  ];

  const vars: Record<string, string> = {};
  for (let i = 0; i < 8; i++) {
    const branch = branches[i % branches.length];
    vars[`git${i}`] = branch.fill;
    vars[`gitBranchLabel${i}`] = branch.label;
  }
  return vars;
}

export function mermaidThemeVariables(
  p: SitePalette,
  dark: boolean,
): Record<string, string | boolean> {
  return {
    // Tells Mermaid which way to shade the colours it derives itself.
    darkMode: dark,

    // Page: diagrams sit directly on the article, no panel of their own.
    background: p.paper,

    // Nodes: a card on the page, same recipe as code blocks.
    primaryColor: p.surface,
    mainBkg: p.surface,
    primaryTextColor: p.ink,
    primaryBorderColor: p.muted,
    nodeBorder: p.muted,

    // Text outside nodes.
    textColor: p.ink,
    titleColor: p.ink,

    // Edges and their labels.
    lineColor: p.muted,
    edgeLabelBackground: p.paper,

    // Secondary / tertiary fills (alt nodes, subgraphs, sequence boxes).
    secondaryColor: p.paper,
    secondaryTextColor: p.ink,
    secondaryBorderColor: p.border,
    tertiaryColor: p.paper,
    tertiaryTextColor: p.ink,
    tertiaryBorderColor: p.border,
    clusterBkg: p.paper,
    clusterBorder: p.border,

    // Notes (sequence / state diagrams): the one accent.
    noteBkgColor: p.surface,
    noteTextColor: p.ink,
    noteBorderColor: p.terracotta,

    // gitGraph: branch lines, commit dots and branch labels.
    ...gitBranchVariables(p, dark),
    commitLabelColor: p.ink,
    commitLabelBackground: p.paper,
  };
}
