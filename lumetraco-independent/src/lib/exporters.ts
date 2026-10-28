import { pathCommands, flatten } from "../../public/vector-geometry";
import type { VectorDocument, VectorFormat } from "./types";

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255];
}
function safeName(name: string): string { return name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80) || "vector"; }
function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = filename;
  document.body.appendChild(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
export function postscript(doc: VectorDocument): string {
  if (doc.paths.some(p => (p.opacity ?? 1) < 0.999)) throw new Error("EPS não suporta semitransparência. Use SVG, PDF ou PNG para preservar a opacidade.");
  const kx = doc.originalWidth / doc.width, ky = doc.originalHeight / doc.height;
  const commands: string[] = ["%!PS-Adobe-3.0 EPSF-3.0", `%%BoundingBox: 0 0 ${doc.originalWidth} ${doc.originalHeight}`, "%%Creator: LumeTraco", "%%EndComments", "gsave", "1 setlinejoin", "1 setlinecap"];
  for (const path of doc.paths) {
    const [r, g, b] = hexRgb(path.color);
    commands.push(`${doc.drawStyle === "stroke" ? hexRgb(doc.strokeColor || "#152e26").map(v => v.toFixed(4)).join(" ") : `${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)}`} setrgbcolor`, "newpath");
    for (const command of pathCommands(path)) {
      const op = command[0];
      if (op === "Z") { commands.push("closepath"); continue; }
      const values = command.slice(1) as number[];
      const transformed = values.map((v, i) => (i % 2 ? doc.originalHeight - v * ky : v * kx).toFixed(3));
      commands.push(`${transformed.join(" ")} ${op === "M" ? "moveto" : op === "L" ? "lineto" : "curveto"}`);
    }
    if (doc.drawStyle === "stroke") commands.push(`${((doc.strokeWidth || 1.25) * (kx + ky) / 2).toFixed(3)} setlinewidth`, "stroke");
    else commands.push("eofill");
  }
  return commands.concat(["grestore", "showpage", "%%EOF"]).join("\n");
}
export function pdf(doc: VectorDocument): Uint8Array {
  const scale = Math.min(1, 14400 / Math.max(doc.originalWidth, doc.originalHeight));
  const width = doc.originalWidth * scale, height = doc.originalHeight * scale;
  const alphas = [...new Set(doc.paths.map(p => p.opacity ?? 1))];
  const sx = width / doc.width, sy = height / doc.height;
  const stream: string[] = ["q", "1 J", "1 j", `${sx.toFixed(5)} 0 0 ${(-sy).toFixed(5)} 0 ${height} cm`];
  for (const path of doc.paths) {
    const [r, g, b] = hexRgb(path.color);
    stream.push(`/GS${alphas.indexOf(path.opacity ?? 1)} gs`);
    if (doc.drawStyle === "stroke") {
      const [sr, sg, sb] = hexRgb(doc.strokeColor || "#152e26");
      stream.push(`${sr.toFixed(5)} ${sg.toFixed(5)} ${sb.toFixed(5)} RG`, `${doc.strokeWidth || 1.25} w`);
    } else stream.push(`${r.toFixed(5)} ${g.toFixed(5)} ${b.toFixed(5)} rg`);
    for (const command of pathCommands(path)) {
      stream.push(command[0] === "Z" ? "h" : `${command.slice(1).join(" ")} ${command[0] === "M" ? "m" : command[0] === "L" ? "l" : "c"}`);
    }
    stream.push(doc.drawStyle === "stroke" ? "S" : "f*");
  }
  stream.push("Q");
  const data = stream.join("\n") + "\n";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /ExtGState << ${alphas.map((_, i) => `/GS${i} ${5+i} 0 R`).join(" ")} >> >> /Contents 4 0 R >>`,
    `<< /Length ${data.length} >>\nstream\n${data}endstream`
  ];
  objects.push(...alphas.map(a => `<< /Type /ExtGState /ca ${a} /CA ${a} >>`));
  let result = "%PDF-1.4\n%LumeTraco\n";
  const offsets = [0];
  for (let i = 0; i < objects.length; i++) { offsets.push(result.length); result += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`; }
  const xref = result.length;
  result += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) result += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  result += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(result);
}
export function dxf(doc: VectorDocument): string {
  const kx = doc.originalWidth / doc.width, ky = doc.originalHeight / doc.height;
  const out = ["0", "SECTION", "2", "HEADER", "9", "$ACADVER", "1", "AC1015", "9", "$INSUNITS", "70", "0", "0", "ENDSEC", "0", "SECTION", "2", "ENTITIES"];
  for (const path of doc.paths) for (const loop of flatten(pathCommands(path), 0.15 / Math.max(kx, ky))) {
    const count = loop.length / 2;
    if (count < 3) continue;
    // DXF exports closed editable outlines; unlike SVG, these have no fills.
    out.push("0", "LWPOLYLINE", "100", "AcDbEntity", "8", "LumeTraco", "100", "AcDbPolyline", "90", String(count), "70", "1");
    for (let i = 0; i < loop.length; i += 2) out.push("10", String(Number((loop[i] * kx).toFixed(4))), "20", String(Number(((doc.height - loop[i + 1]) * ky).toFixed(4))));
  }
  return out.concat(["0", "ENDSEC", "0", "EOF", ""]).join("\n");
}
async function png(doc: VectorDocument): Promise<Blob> {
  const scale = Math.min(1, 2400 / Math.max(doc.originalWidth, doc.originalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(doc.originalWidth * scale));
  canvas.height = Math.max(1, Math.round(doc.originalHeight * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("The PNG renderer is unavailable.");
  const url = URL.createObjectURL(new Blob([doc.svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = new Image(); image.src = url; await image.decode();
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  } finally { URL.revokeObjectURL(url); }
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("PNG export could not be created.");
  return blob;
}
export async function downloadVector(doc: VectorDocument, format: VectorFormat, originalName: string): Promise<void> {
  const ext = safeName(originalName) + "." + format;
  switch (format) {
    case "svg": saveBlob(new Blob([doc.svg], { type: "image/svg+xml" }), ext); return;
    case "png": saveBlob(await png(doc), ext); return;
    case "pdf": saveBlob(new Blob([pdf(doc) as BlobPart], { type: "application/pdf" }), ext); return;
    case "eps": saveBlob(new Blob([postscript(doc)], { type: "application/postscript" }), ext); return;
    case "dxf": saveBlob(new Blob([dxf(doc)], { type: "application/dxf" }), ext); return;
  }
}
