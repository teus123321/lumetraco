"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronDown, Download, Eye, ImageIcon, LoaderCircle, Maximize2, Minus, Plus, RefreshCcw, SlidersHorizontal, Sparkles } from "lucide-react";
import { useImageSession } from "@/components/image-session";
import { UploadZone } from "@/components/upload-zone";
import { loadImage, vectorizeImage } from "@/lib/processing";
import { downloadVector } from "@/lib/exporters";
import { DEFAULT_OPTIONS, type VectorDocument, type VectorFormat, type VectorOptions } from "@/lib/types";

type ViewMode = "compare" | "vector" | "original";
type Backdrop = "checker" | "white" | "dark";
export default function EditorPage() {
  const { file, setFile } = useImageSession();
  const [inputSrc, setInputSrc] = useState(""), [inputImage, setInputImage] = useState<HTMLImageElement | null>(null);
  const [doc, setDoc] = useState<VectorDocument | null>(null), [svgSrc, setSvgSrc] = useState("");
  const [options, setOptions] = useState<VectorOptions>(DEFAULT_OPTIONS), [processing, setProcessing] = useState(false);
  const [error, setError] = useState(""), [mode, setMode] = useState<ViewMode>("compare"), [backdrop, setBackdrop] = useState<Backdrop>("checker");
  const [split, setSplit] = useState(50), [zoom, setZoom] = useState(100), [format, setFormat] = useState<VectorFormat>("svg"), [downloading, setDownloading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let alive = true, url = "";
    setInputImage(null); setDoc(null); setError("");
    if (file) loadImage(file).then(loaded => {
      url = loaded.url;
      if (alive) { setInputSrc(url); setInputImage(loaded.image); }
      else URL.revokeObjectURL(url);
    }).catch(e => { if (alive) setError(e instanceof Error ? e.message : "Erro ao abrir a imagem"); });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [file]);
  useEffect(() => {
    if (!inputImage) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setProcessing(true); setError("");
      vectorizeImage(inputImage, options, controller.signal).then(result => {
        if (!controller.signal.aborted) { setDoc(result); setProcessing(false); }
      }).catch(e => {
        if (!controller.signal.aborted) { setError(e instanceof Error ? e.message : "Falha no processamento"); setProcessing(false); }
      });
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [inputImage, options]);
  useEffect(() => {
    if (!doc) { setSvgSrc(""); return; }
    const url = URL.createObjectURL(new Blob([doc.svg], { type: "image/svg+xml" }));
    setSvgSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [doc]);
  const patch = useCallback(<K extends keyof VectorOptions>(key: K, value: VectorOptions[K]) => setOptions(old => ({ ...old, [key]: value })), []);
  async function exportFile() {
    if (!doc || !file || downloading) return;
    setDownloading(true); setError("");
    try { await downloadVector(doc, format, file.name); }
    catch (e) { setError(e instanceof Error ? e.message : "Falha na exportação"); }
    finally { setDownloading(false); }
  }
  if (!file) return <main className="empty-editor container"><div className="eyebrow"><span className="eyebrow-dot"/> ÁREA DE CRIAÇÃO</div><h1>Comece com uma imagem</h1><p>Envie uma imagem para gerar um arquivo vetorial.</p><UploadZone compact/></main>;
  return <main className="editor-page">
    <div className="editor-topbar"><div className="editor-breadcrumb"><Link href="/"><ArrowLeft size={17}/> Nova imagem</Link><span className="breadcrumb-separator">/</span><strong title={file.name}>{file.name}</strong></div><div className="editor-topbar-actions"><span className="editor-private"><Check size={14}/> Processamento local</span><button type="button" className="btn btn-small btn-outline" onClick={() => fileInput.current?.click()}><RefreshCcw size={15}/> Trocar imagem</button><input type="file" ref={fileInput} hidden accept="image/png,image/jpeg,image/gif,image/bmp,image/webp,.bmp" onChange={e => { const chosen = e.target.files?.[0]; if (chosen) setFile(chosen); e.target.value = ""; }}/></div></div>
    <div className="editor-layout"><section className="editor-main">
      <div className="viewer-toolbar"><div className="view-tabs"><button type="button" className={mode === "compare" ? "active" : ""} onClick={() => setMode("compare")}>Comparar</button><button type="button" className={mode === "vector" ? "active" : ""} onClick={() => setMode("vector")}>Vetor</button><button type="button" className={mode === "original" ? "active" : ""} onClick={() => setMode("original")}>Original</button></div><div className="zoom-tools"><button type="button" onClick={() => setZoom(z => Math.max(25,z-25))} aria-label="Reduzir zoom"><Minus size={17}/></button><span>{zoom}%</span><button type="button" onClick={() => setZoom(z => Math.min(400,z+25))} aria-label="Ampliar zoom"><Plus size={17}/></button><button type="button" onClick={() => setZoom(100)} aria-label="Restaurar zoom" title="Ajustar imagem"><Maximize2 size={15}/></button></div></div>
      <div className={`viewer-stage viewer-stage--${backdrop}`}><div className="viewer-canvas-scroll"><div className="viewer-canvas" style={{ width: `${Math.max(100, zoom)}%`, maxWidth: zoom <= 100 ? "880px" : "none" }}>
        {inputSrc && <img className="viewer-picture" src={inputSrc} alt="Imagem original enviada" draggable={false}/>}
        {svgSrc && mode !== "original" && <div className="viewer-vector-layer" style={{ clipPath: mode === "compare" ? `inset(0 0 0 ${split}%)` : "none" }}><img className="viewer-picture" src={svgSrc} alt="Prévia do vetor gerado" draggable={false}/></div>}
        {mode === "compare" && svgSrc && <><div className="split-line" style={{left: `${split}%`}}><span className="split-handle">‹ ›</span></div><input className="split-range" type="range" min="0" max="100" value={split} onChange={e => setSplit(Number(e.target.value))} aria-label="Comparação da imagem original com vetor"/></>}
        {processing && <div className="processing-overlay"><LoaderCircle className="spin" size={27}/><strong>Vetorizando imagem...</strong><span>Criando áreas de cor e contornos vetoriais</span></div>}
      </div></div></div>
      <div className="viewer-status"><div><span className="status-dot"/> {processing ? "Processando..." : doc ? "Pronto para baixar" : "Preparando imagem..."}{doc && <span className="status-detail"> · {doc.paletteSize} cores · {doc.totalLoops.toLocaleString()} contornos</span>}</div><div className="backdrop-switch"><span>Fundo</span><button type="button" aria-label="Fundo quadriculado" className={`bg-swatch checker ${backdrop === "checker" ? "active" : ""}`} onClick={() => setBackdrop("checker")}/><button type="button" aria-label="Fundo branco" className={`bg-swatch white ${backdrop === "white" ? "active" : ""}`} onClick={() => setBackdrop("white")}/><button type="button" aria-label="Fundo escuro" className={`bg-swatch dark ${backdrop === "dark" ? "active" : ""}`} onClick={() => setBackdrop("dark")}/></div></div>
      <div className="viewer-note"><Eye size={17}/> Arraste o divisor para comparar o SVG produzido com a imagem original.</div>
    </section>
    <aside className="editor-sidebar"><div className="sidebar-title"><div><SlidersHorizontal size={18}/><h2>Ajustes da vetorização</h2></div><button type="button" onClick={() => setOptions(DEFAULT_OPTIONS)}>Restaurar</button></div>
      <section className="sidebar-control"><div className="range-label"><label htmlFor="colors">Cores da paleta</label><output>{options.colors}</output></div><input id="colors" type="range" min="2" max="24" step="1" value={options.colors} onChange={e => patch("colors", Number(e.target.value))}/><p>Menos cores geram formas mais simples e arquivos menores.</p></section>
      <section className="sidebar-control"><div className="range-label"><label htmlFor="detail">Detalhe dos caminhos</label><output>{options.detail <= .5 ? "Alto" : options.detail < 1.5 ? "Equilibrado" : "Suave"}</output></div><input id="detail" type="range" min="0.25" max="2.5" step="0.25" value={options.detail} onChange={e => patch("detail", Number(e.target.value))}/><p>Mais detalhes preservam cantos; linhas suaves usam menos pontos.</p></section>
      <section className="sidebar-control"><div className="range-label"><label htmlFor="smoothing">Redução de ruído</label><output>{["Desligada","Leve","Forte"][options.smoothing]}</output></div><input id="smoothing" type="range" min="0" max="2" value={options.smoothing} onChange={e => patch("smoothing", Number(e.target.value))}/><p>Suaviza pixels próximos antes de agrupar as cores.</p></section>
      <section className="sidebar-control"><div className="range-label"><label htmlFor="resolution">Resolução de análise</label><output>{options.resolution} px</output></div><select id="resolution" value={options.resolution} onChange={e => patch("resolution", Number(e.target.value))}><option value="220">Rápido (220 px)</option><option value="340">Equilibrado (340 px)</option><option value="460">Detalhado (460 px)</option></select><p>Tamanho máximo do lado maior durante a análise.</p></section>
      <div className="sidebar-divider"/>
      <section className="export-section"><h2><Download size={18}/> Exportar resultado</h2><label htmlFor="export-format">Formato do arquivo</label><div className="format-select"><select id="export-format" value={format} onChange={e => setFormat(e.target.value as VectorFormat)}><option value="svg">SVG — Vetor editável</option><option value="png">PNG — Imagem raster</option><option value="pdf">PDF — Caminhos vetoriais</option><option value="eps">EPS — Vetores PostScript</option><option value="dxf">DXF — Contornos</option></select><ChevronDown size={15}/></div>{format === "dxf" && <p className="format-note">DXF contém contornos, sem preenchimento de cor.</p>}{format === "png" && <p className="format-note">PNG é rasterizado, com até 2400 px no lado maior.</p>}<button type="button" onClick={exportFile} disabled={!doc || processing || downloading} className="btn btn-primary export-button">{downloading ? <LoaderCircle size={18} className="spin"/> : <Download size={18}/>} {downloading ? "Exportando..." : `Baixar ${format.toUpperCase()}`}</button><p className="export-free"><Sparkles size={14}/> Gratuito e sem cadastro</p></section>
      {error && <div className="editor-error" role="alert">{error}</div>}
    </aside></div>
    <div className="editor-bottom-notice"><ImageIcon size={16}/> Motor independente de quantização de cores e contornos, sem uso de modelos comerciais privados.</div>
  </main>;
}
