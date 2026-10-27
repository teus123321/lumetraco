import type { VectorDocument, VectorPath } from "./types";

export type RegionEdit = { color?: string; hidden?: boolean; rounded?: boolean };
export type RegionEdits = Record<number, RegionEdit>;
export type DrawStyle = "fill" | "stroke";
export type ExportStyle = { drawStyle: DrawStyle; strokeWidth: number; strokeColor: string; cornerRadius: number };
export const DEFAULT_EXPORT_STYLE: ExportStyle = { drawStyle: "fill", strokeWidth: 1.25, strokeColor: "#152e26", cornerRadius: 0.22 };

export function signedArea(loop: number[]): number {
  let sum = 0;
  for (let i = 0; i < loop.length; i += 2) {
    const j = (i + 2) % loop.length;
    sum += loop[i] * loop[j + 1] - loop[j] * loop[i + 1];
  }
  return sum / 2;
}

function roundedPath(points: number[], amount: number): string {
  const count = points.length / 2;
  if (count < 3) return "";
  const norm = (v: number) => Number(v.toFixed(3));
  if (amount <= 0) {
    let result = `M ${points[0]} ${points[1]}`;
    for (let i = 1; i < count; i++) result += ` L ${points[i * 2]} ${points[i * 2 + 1]}`;
    return result + " Z";
  }
  const section = (i: number) => {
    const previous = (i - 1 + count) % count, next = (i + 1) % count;
    const x = points[i * 2], y = points[i * 2 + 1];
    const px = points[previous * 2], py = points[previous * 2 + 1];
    const nx = points[next * 2], ny = points[next * 2 + 1];
    return {
      ax: norm(x + (px - x) * amount), ay: norm(y + (py - y) * amount),
      bx: norm(x + (nx - x) * amount), by: norm(y + (ny - y) * amount),
      x, y
    };
  };
  const first = section(0);
  let d = `M ${first.bx} ${first.by}`;
  for (let i = 1; i < count; i++) {
    const t = section(i);
    d += ` L ${t.ax} ${t.ay} Q ${t.x} ${t.y} ${t.bx} ${t.by}`;
  }
  d += ` L ${first.ax} ${first.ay} Q ${first.x} ${first.y} ${first.bx} ${first.by} Z`;
  return d;
}

export function pathData(path: VectorPath, rounded = false, radius = 0.22): string {
  return path.loops.map(loop => roundedPath(loop, rounded ? Math.max(0.02, Math.min(0.45, radius)) : 0)).join(" ");
}

export function effectiveColor(path: VectorPath, edit?: RegionEdit): string {
  return edit?.color ?? path.color;
}

/** Rebuilds a real vector SVG. No embedded raster images or opaque reference APIs. */
export function renderVector(source: VectorDocument, edits: RegionEdits, style: ExportStyle): VectorDocument {
  const paths = source.paths.flatMap((path, index) => {
    if (edits[index]?.hidden) return [];
    return [{ color: effectiveColor(path, edits[index]), loops: path.loops }];
  });
  const svgPaths = source.paths.flatMap((path, index) => {
    const edit = edits[index];
    if (edit?.hidden) return [];
    const d = pathData(path, Boolean(edit?.rounded), style.cornerRadius);
    if (!d) return [];
    const color = effectiveColor(path, edit);
    const fill = style.drawStyle === "fill" ? color : "none";
    const stroke = style.drawStyle === "stroke" ? style.strokeColor : "none";
    return [`<path data-region="${index}" d="${d}" fill="${fill}" fill-rule="evenodd" stroke="${stroke}" stroke-width="${style.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`];
  }).join("\n");
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${source.originalWidth}" height="${source.originalHeight}" viewBox="0 0 ${source.width} ${source.height}">\n${svgPaths}\n</svg>`;
  return { ...source, paths, svg, totalLoops: paths.reduce((n, p) => n + p.loops.length, 0), paletteSize: new Set(paths.map(p => p.color)).size, drawStyle: style.drawStyle, strokeWidth: style.strokeWidth, strokeColor: style.strokeColor };
}

/** Helper for manual region selection, not pixel sampling. */
export function regionArea(path: VectorPath): number {
  return Math.abs(path.loops.reduce((sum, loop) => sum + signedArea(loop), 0));
}

export function mostLikelyBackground(paths: VectorPath[]): string | null {
  const totals = new Map<string, number>();
  paths.forEach(p => totals.set(p.color, (totals.get(p.color) ?? 0) + regionArea(p)));
  let color: string | null = null, area = 0;
  for (const [key, value] of totals) { if (value > area) { color = key; area = value; } }
  return color;
}
