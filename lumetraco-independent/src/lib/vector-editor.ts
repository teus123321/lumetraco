import { unique, union, gapSvg } from "../../public/vector-edges";
import { pathCommands, toSvg, flatten } from "../../public/vector-geometry";
import type { VectorDocument, VectorPath } from "./types";

export type RegionEdit = { color?: string; hidden?: boolean; rounded?: boolean; opacity?: number };
export type RegionEdits = Record<number, RegionEdit>;
export type DrawStyle = "fill" | "stroke";
export type ExportStyle = { drawStyle: DrawStyle; strokeWidth: number; strokeColor: string; cornerRadius: number; edgeMode?: boolean; gapFill?: boolean; outputScale?: number; lineTolerance?: number };
export const DEFAULT_EXPORT_STYLE: ExportStyle = { drawStyle: "fill", strokeWidth: 1.25, strokeColor: "#152e26", cornerRadius: 0.22, edgeMode: false, gapFill: true, outputScale: 1, lineTolerance: 0.15 };

export function signedArea(loop: number[]): number {
  let sum = 0;
  for (let i = 0; i < loop.length; i += 2) {
    const j = (i + 2) % loop.length;
    sum += loop[i] * loop[j + 1] - loop[j] * loop[i + 1];
  }
  return sum / 2;
}

export function pathData(path: VectorPath, rounded = false, radius = 0.22): string {
  return toSvg(pathCommands(path, { rounded, radius, curves: false }));
}

export function effectiveColor(path: VectorPath, edit?: RegionEdit): string {
  return edit?.color ?? path.color;
}

/** Rebuilds a real vector SVG. No embedded raster images or opaque reference APIs. */
export function renderVector(source: VectorDocument, edits: RegionEdits, style: ExportStyle): VectorDocument {
  const paths = source.paths.flatMap((path, index) => {
    if (edits[index]?.hidden) return [];
    return [{ ...path, color: effectiveColor(path, edits[index]), opacity: edits[index]?.opacity ?? path.opacity ?? 1, commands: pathCommands(path, { rounded: Boolean(edits[index]?.rounded), radius: style.cornerRadius, curves: false }) }];
  });
  let svgPaths = source.paths.flatMap((path, index) => {
    const edit = edits[index];
    if (edit?.hidden) return [];
    const d = pathData(path, Boolean(edit?.rounded), style.cornerRadius);
    if (!d) return [];
    const color = effectiveColor(path, edit);
    const fill = style.drawStyle === "fill" ? color : "none";
    const stroke = style.drawStyle === "stroke" ? style.strokeColor : "none";
    return [`<path data-region="${index}" d="${d}" fill="${fill}" fill-rule="evenodd" opacity="${edit?.opacity ?? path.opacity ?? 1}" stroke="${stroke}" stroke-width="${style.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`];
  }).join("\n");
  if (style.drawStyle === "stroke" && style.edgeMode) svgPaths = unique(paths).map(e => `<path d="${toSvg([["M", ...e.a] as import("../../public/vector-geometry").Command, e.c])}" fill="none" stroke="${style.strokeColor}" stroke-width="${style.strokeWidth}" stroke-linejoin="round" stroke-linecap="round"/>`).join("\n");
  if (style.drawStyle === "fill" && style.gapFill) {
    svgPaths = gapSvg(paths) + "\n" + svgPaths;
  }
  const outputScale = style.outputScale ?? 1;
  const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${source.originalWidth * outputScale}" height="${source.originalHeight * outputScale}" viewBox="0 0 ${source.width} ${source.height}">\n${svgPaths}\n</svg>`;
  return { ...source, paths, svg, originalWidth: source.originalWidth * outputScale, originalHeight: source.originalHeight * outputScale, edgeMode: style.edgeMode, lineTolerance: style.lineTolerance, nodeCount: paths.reduce((n,p) => n + (p.commands?.filter(c => c[0] !== "Z").length ?? 0), 0), totalLoops: paths.reduce((n, p) => n + p.loops.length, 0), paletteSize: new Set(paths.map(p => p.color)).size, drawStyle: style.drawStyle, strokeWidth: style.strokeWidth, strokeColor: style.strokeColor };
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

/** Only remove connected regions reaching the image border, never all matching pixels. */
export function backgroundRegions(doc: VectorDocument, edits: RegionEdits): number[] {
  const scores = new Map<string, number>();
  const candidates: { index: number; color: string; score: number }[] = [];
  doc.paths.forEach((path, index) => {
    if (edits[index]?.hidden) return;
    let score = 0;
    for (const loop of path.loops) for (let i = 0; i < loop.length; i += 2) {
      const j = (i + 2) % loop.length;
      if ((loop[i] === 0 && loop[j] === 0) || (loop[i] === doc.width && loop[j] === doc.width) || (loop[i+1] === 0 && loop[j+1] === 0) || (loop[i+1] === doc.height && loop[j+1] === doc.height)) score += Math.hypot(loop[i]-loop[j],loop[i+1]-loop[j+1]);
    }
    if (score > 0) {
      const color = effectiveColor(path, edits[index]);
      candidates.push({ index, color, score }); scores.set(color, (scores.get(color) || 0) + score);
    }
  });
  const color = [...scores].sort((a,b) => b[1]-a[1])[0]?.[0];
  return candidates.filter(c => c.color === color).map(c => c.index);
}

/** Union of adjacent regions from our shared graph; disjoint components remain one editable compound path. */
export function mergeRegions(source: VectorDocument, edits: RegionEdits, style: ExportStyle, selected: number[]): VectorDocument {
  const indices=[...new Set(selected)].filter(i => source.paths[i] && !edits[i]?.hidden).sort((a,b)=>a-b);
  if(indices.length<2)throw new Error("Selecione pelo menos duas regiões visíveis.");
  const rendered=source.paths.map((p,i)=>({...p,color:effectiveColor(p,edits[i]),opacity:edits[i]?.opacity??p.opacity??1,commands:pathCommands(p,{rounded:Boolean(edits[i]?.rounded),radius:style.cornerRadius,curves:false})}));
  if(indices.some(i=>edits[i]?.rounded))throw new Error("Desative o arredondamento manual das regiões antes de unir.");
  const chosen=indices.map(i=>rendered[i]);
  const commands=union(chosen), merged={...chosen[0],commands,loops:flatten(commands,.05)};
  const paths=rendered.filter((_,i)=>!edits[i]?.hidden&&!indices.includes(i));paths.push(merged);
  return {...source,paths,svg:"",totalLoops:paths.reduce((n,p)=>n+p.loops.length,0)};
}
