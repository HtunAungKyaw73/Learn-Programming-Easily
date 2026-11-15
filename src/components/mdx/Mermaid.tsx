"use client";

import { useEffect, useId, useState } from "react";
import { useTheme } from "next-themes";
import { mermaidThemeVariables, type SitePalette } from "@/lib/mermaid-theme";
import { svgMinWidth } from "@/lib/mermaid-svg";

type State =
  | { status: "source" }
  | { status: "ready"; svg: string }
  | { status: "error"; message: string };

const PALETTE_VARS: Record<keyof SitePalette, string> = {
  paper: "--paper",
  surface: "--surface",
  ink: "--ink",
  muted: "--muted",
  border: "--border",
  terracotta: "--terracotta",
  gold: "--gold",
};

function readPalette(): SitePalette {
  const styles = getComputedStyle(document.documentElement);
  const palette = {} as SitePalette;
  for (const key of Object.keys(PALETTE_VARS) as (keyof SitePalette)[]) {
    palette[key] = styles.getPropertyValue(PALETTE_VARS[key]).trim();
  }
  return palette;
}

// Each render call needs an id no element on the page already has: Mermaid
// removes any existing element with that id first, which would delete the
// diagram currently on screen when it is re-drawn for a theme change.
let renderCount = 0;

/**
 * Renders a ```mermaid block as a diagram. The remark plugin in
 * `lib/remark-mermaid.ts` puts this element in place of the code block.
 *
 * The `mermaid` package is large, so it is only ever loaded here, through a
 * dynamic import inside an effect: pages without a diagram never fetch it.
 * Until it has loaded — and for readers without JavaScript — the diagram's
 * source is shown instead. A syntax error keeps the source on screen with the
 * parser's message, and never takes the rest of the article down with it.
 */
export function Mermaid({ chart }: { chart: string }) {
  const baseId = useId().replace(/[^a-zA-Z0-9]/g, "");
  // Used only to re-run the effect on a theme change; the colours themselves
  // come from the CSS variables, which is where the theme actually lives.
  const { resolvedTheme } = useTheme();
  const [state, setState] = useState<State>({ status: "source" });

  useEffect(() => {
    let cancelled = false;
    const renderId = `mermaid-${baseId}-${renderCount++}`;

    async function draw() {
      try {
        const { default: mermaid } = await import("mermaid");
        if (cancelled) return;

        // Read after the await: on a theme toggle this effect runs before
        // next-themes has put the new class on <html>.
        const root = document.documentElement;
        mermaid.initialize({
          startOnLoad: false,
          // We render the error state ourselves, below.
          suppressErrorRendering: true,
          // Mermaid's default. Checked in the browser: `<br/>` and `<i>` in
          // labels still render under it, so nothing looser is needed.
          securityLevel: "strict",
          theme: "base",
          themeVariables: mermaidThemeVariables(
            readPalette(),
            root.classList.contains("dark"),
          ),
          fontFamily: getComputedStyle(document.body).fontFamily,
        });

        const { svg } = await mermaid.render(renderId, chart);
        if (!cancelled) setState({ status: "ready", svg });
      } catch (err) {
        // Mermaid renders into a scratch element; make sure a failed render
        // doesn't leave it behind.
        document.getElementById(renderId)?.remove();
        document.getElementById(`d${renderId}`)?.remove();
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    draw();
    return () => {
      cancelled = true;
    };
  }, [chart, resolvedTheme, baseId]);

  if (state.status === "ready") {
    // Handed to CSS: the diagram may shrink to fit, but not past the point
    // where its text is too small to read; beyond that it scrolls in its own
    // box rather than widening the page.
    const minWidth = svgMinWidth(state.svg);
    return (
      <figure
        className="mermaid-diagram not-prose"
        style={
          minWidth === null
            ? undefined
            : ({ "--mermaid-min-width": `${minWidth}px` } as React.CSSProperties)
        }
        // Mermaid's own output: an SVG it has already sanitised.
        dangerouslySetInnerHTML={{ __html: state.svg }}
      />
    );
  }

  return (
    <figure className="mermaid-diagram mermaid-diagram--source not-prose">
      <pre className="mermaid-source">
        <code>{chart}</code>
      </pre>
      {state.status === "error" && (
        <figcaption role="alert" className="mermaid-error">
          This diagram could not be drawn: {state.message}
        </figcaption>
      )}
    </figure>
  );
}
