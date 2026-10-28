"use client";
import { VectorViewport } from "@/components/vector-viewport";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronDown, Crop, Download, Eye, ImageIcon, LoaderCircle, Maximize2, Minus, Plus, RefreshCcw, RotateCcw, Scissors, SlidersHorizontal, Sparkles, Undo2, Redo2, WandSparkles } from "lucide-react";
import { useImageSession, type EditorDraft, type EditorHistory } from "@/components/image-session";
import { UploadZone } from "@/components/upload-zone";
import { loadImage, vectorizeImage } from "@/lib/processing";
import { downloadVector } from "@/lib/exporters";
import { DEFAULT_OPTIONS, type VectorDocument, type VectorFormat, type VectorOptions } from "@/lib/types";
import { DEFAULT_EXPORT_STYLE, backgroundRegions, pathData, regionArea, renderVector, type ExportStyle, type RegionEdits } from "@/lib/vector-editor";

type ViewMode = "compare" | "vector" | "original";
type Backdrop = "checker" | "white" | "dark";
type EditTab = "palette" | "regions" | "settings";
const validHex = /^#[\da-fA-F]{6}$/;

export default function EditorPage() {
  const { file, setFile, editorDraft } = useImageSession();
  const saved = useRef(editorDraft.current?.file === file ? editorDraft.current : null);
  const latestDraft = useRef<EditorDraft | null>(null);
  const [inputSrc, setInputSrc] = useState("");
  const [inputImage, setInputImage] = useState<HTMLImageElement | null>(null);
  const [sourceDoc, setSourceDoc] = useState<VectorDocument | null>(saved.current?.sourceDoc ?? null);
  const [svgSrc, setSvgSrc] = useState("");
  const [options, setOptions] = useState<VectorOptions>(saved.current?.options ?? DEFAULT_OPTIONS);
  const [exportStyle, setExportStyle] = useState<ExportStyle>(saved.current?.exportStyle ?? DEFAULT_EXPORT_STYLE);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<ViewMode>("compare");
  const [backdrop, setBackdrop] = useState<Backdrop>("checker");
  const [split, setSplit] = useState(50);
  const [zoom, setZoom] = useState(0);
  const [pan, setPan] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const activeJob = useRef<AbortController | null>(null);
  const [format, setFormat] = useState<VectorFormat>("svg");
  const [downloading, setDownloading] = useState(false);
  const [tab, setTab] = useState<EditTab>("palette");
  const [editingRegions, setEditingRegions] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [edits, setEdits] = useState<RegionEdits>(saved.current?.edits ?? {});
  const [undoStack, setUndoStack] = useState<EditorHistory[]>(saved.current?.undoStack ?? []);
  const [redoStack, setRedoStack] = useState<EditorHistory[]>(saved.current?.redoStack ?? []);
  const [cropping, setCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0, w: 100, h: 100 });
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true, url = "";
    setInputImage(null); setInputSrc(""); setProcessing(false); setCancelled(false); setSourceDoc(null); setError(""); setSelected(null);
    if (saved.current?.file === file) {
      setSourceDoc(saved.current.sourceDoc); setEdits(saved.current.edits); setUndoStack(saved.current.undoStack); setRedoStack(saved.current.redoStack);
    } else { setEdits({}); setUndoStack([]); setRedoStack([]); }
    if (file) loadImage(file).then(loaded => {
      url = loaded.url;
      if (alive) { setInputSrc(url); setInputImage(loaded.image); }
      else URL.revokeObjectURL(url);
    }).catch(e => { if (alive) setError(e instanceof Error ? e.message : "Erro ao abrir a imagem"); });
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [file]);

  useEffect(() => {
    if (!inputImage || cancelled) return;
    if (saved.current?.file === file && saved.current.options === options) { setProcessing(false); return; }
    saved.current = null;
    const controller = new AbortController();
    activeJob.current = controller;
    setProcessing(true);
    const timer = window.setTimeout(() => {
      setProcessing(true); setError("");
      vectorizeImage(inputImage, options, controller.signal).then(result => {
        if (!controller.signal.aborted) { setSourceDoc(result); setEdits({}); setUndoStack([]); setRedoStack([]); setSelected(null); setProcessing(false); }
      }).catch(e => {
        if (!controller.signal.aborted) { setError(e instanceof Error ? e.message : "Falha no processamento"); setProcessing(false); }
      });
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [inputImage, options, cancelled, file]);

  useEffect(() => {
    latestDraft.current = file && sourceDoc && !processing ? { file, sourceDoc, options, edits, exportStyle, undoStack, redoStack } : null;
  }, [file, sourceDoc, options, edits, exportStyle, undoStack, redoStack, processing]);
  useEffect(() => () => { editorDraft.current = latestDraft.current; }, [editorDraft]);

  const doc = useMemo(() => sourceDoc ? renderVector(sourceDoc, edits, exportStyle) : null, [sourceDoc, edits, exportStyle]);
  useEffect(() => {
    if (!doc) { setSvgSrc(""); return; }
    const url = URL.createObjectURL(new Blob([doc.svg], { type: "image/svg+xml" }));
    setSvgSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [doc]);

  const palette = useMemo(() => {
    if (!sourceDoc) return [] as { color: string; count: number; area: number }[];
    const m = new Map<string, { color: string; count: number; area: number }>();
    sourceDoc.paths.forEach((path, index) => {
      const color = edits[index]?.color ?? path.color;
      if (edits[index]?.hidden) return;
      const existing = m.get(color) ?? { color, count: 0, area: 0 };
      existing.count++; existing.area += regionArea(path); m.set(color, existing);
    });
    return [...m.values()].sort((a, b) => b.area - a.area);
  }, [sourceDoc, edits]);

  function commitEdits(next: RegionEdits) {
    setUndoStack(old => [...old.slice(-19), { edits, exportStyle }]); setRedoStack([]); setEdits(next);
  }
  function changeStyle(next: ExportStyle) {
    setUndoStack(old => [...old.slice(-19), { edits, exportStyle }]); setRedoStack([]); setExportStyle(next);
  }
  function changeRegion(index: number, data: Partial<RegionEdits[number]>) {
    commitEdits({ ...edits, [index]: { ...edits[index], ...data } });
  }
  function editWholeColor(color: string, patch: { color?: string; hidden?: boolean }) {
    if (!sourceDoc) return;
    const updated = { ...edits };
    sourceDoc.paths.forEach((region, index) => {
      if (edits[index]?.hidden) return;
      if ((edits[index]?.color ?? region.color) === color) updated[index] = { ...updated[index], ...patch };
    });
    commitEdits(updated);
  }
  function undo() {
    if (!undoStack.length) return;
    setEdits(undoStack[undoStack.length - 1].edits); setExportStyle(undoStack[undoStack.length - 1].exportStyle); setUndoStack(v => v.slice(0, -1)); setRedoStack(v => [...v, { edits, exportStyle }]);
  }
  function redo() {
    if (!redoStack.length) return;
    setEdits(redoStack[redoStack.length - 1].edits); setExportStyle(redoStack[redoStack.length - 1].exportStyle); setRedoStack(v => v.slice(0, -1)); setUndoStack(v => [...v, { edits, exportStyle }]);
  }
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "z") return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      event.preventDefault(); if (event.shiftKey) redo(); else undo();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
    // keyboard shortcuts use the current history stacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edits, exportStyle, undoStack, redoStack]);

  const patch = useCallback(<K extends keyof VectorOptions>(key: K, value: VectorOptions[K]) => {
    setCancelled(false); setProcessing(true);
    setOptions(old => ({ ...old, [key]: value }));
    setEdits({}); setUndoStack([]); setRedoStack([]); setSelected(null);
  }, []);
  function removeBackground() {
    if (!sourceDoc) return;
    const indices = backgroundRegions(sourceDoc, edits);
    const next = { ...edits };
    indices.forEach(i => { next[i] = { ...next[i], hidden: true }; });
    if (indices.length) commitEdits(next);
  }
  function setPreset(preset: "art" | "cut" | "engrave") {
    if (preset === "art") changeStyle({ ...DEFAULT_EXPORT_STYLE, drawStyle: "fill" });
    if (preset === "cut") changeStyle({ ...DEFAULT_EXPORT_STYLE, drawStyle: "stroke", strokeWidth: 0.4, strokeColor: "#101010" });
    if (preset === "engrave") changeStyle({ ...DEFAULT_EXPORT_STYLE, drawStyle: "stroke", strokeWidth: 1.2, strokeColor: "#101010" });
  }
  async function applyCrop() {
    if (!inputImage || !file) return;
    const sw = inputImage.naturalWidth, sh = inputImage.naturalHeight;
    const sx = Math.floor(sw * crop.x / 100), sy = Math.floor(sh * crop.y / 100);
    const w = Math.max(1, Math.min(sw - sx, Math.floor(sw * crop.w / 100)));
    const h = Math.max(1, Math.min(sh - sy, Math.floor(sh * crop.h / 100)));
    const canvas = document.createElement("canvas"); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) { setError("Seu navegador não suporta recorte de imagens."); return; }
    ctx.drawImage(inputImage, sx, sy, w, h, 0, 0, w, h);
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, "image/png"));
    if (!blob) { setError("Não foi possível recortar a imagem."); return; }
    setFile(new File([blob], file.name.replace(/\.[^.]+$/, "") + "-recorte.png", { type: "image/png" }));
    setCropping(false); setCrop({ x: 0, y: 0, w: 100, h: 100 });
  }
  async function exportFile() {
    if (!doc || !file || downloading) return;
    setDownloading(true); setError("");
    try { await downloadVector(doc, format, file.name); }
    catch (e) { setError(e instanceof Error ? e.message : "Falha na exportação"); }
    finally { setDownloading(false); }
  }

  if (!file) return <main className="empty-editor container"><div className="eyebrow"><span className="eyebrow-dot"/> ESTÚDIO DE VETORES</div><h1>Comece com uma imagem</h1><p>Envie um arquivo ou experimente a imagem de demonstração para explorar o editor.</p><UploadZone compact/></main>;

  return <main className="editor-page">
    <div className="editor-topbar"><div className="editor-breadcrumb"><Link href="/"><ArrowLeft size={17}/> Início</Link><span className="breadcrumb-separator">/</span><strong title={file.name}>{file.name}</strong></div><div className="editor-topbar-actions"><span className="editor-private"><Check size={14}/> Processamento local</span><button type="button" className="btn btn-small btn-outline" onClick={() => setCropping(true)}><Crop size={15}/> Recortar</button><button type="button" className="btn btn-small btn-outline" onClick={() => fileInput.current?.click()}><RefreshCcw size={15}/> Trocar imagem</button><input type="file" ref={fileInput} hidden accept="image/png,image/jpeg,image/gif,image/bmp,image/webp,.bmp" onChange={e => { const chosen = e.target.files?.[0]; if (chosen) setFile(chosen); e.target.value = ""; }}/></div></div>
    <div className="editor-layout"><section className="editor-main">
      <div className="viewer-toolbar"><div className="view-tabs"><button type="button" className={mode === "compare" ? "active" : ""} onClick={() => { setMode("compare"); setEditingRegions(false); }}>Comparar</button><button type="button" className={mode === "vector" ? "active" : ""} onClick={() => setMode("vector")}>Vetor</button><button type="button" className={mode === "original" ? "active" : ""} onClick={() => { setMode("original"); setEditingRegions(false); }}>Original</button></div><div className="zoom-tools"><button type="button" onClick={() => setZoom(z => Math.max(10,(z || 100)-25))} aria-label="Reduzir zoom"><Minus size={17}/></button><span>{zoom ? `${Math.round(zoom)}%` : "Ajustado"}</span><button type="button" onClick={() => setZoom(z => Math.min(800,(z || 100)+25))} aria-label="Ampliar zoom"><Plus size={17}/></button><button type="button" onClick={() => setZoom(0)} aria-label="Restaurar zoom" title="Ajustar imagem"><Maximize2 size={15}/></button><button type="button" onClick={() => setZoom(100)} aria-label="Tamanho real">1:1</button></div></div>
      <div className="editor-extra-toolbar"><button type="button" className={editingRegions ? "selected" : ""} onClick={() => { setEditingRegions(v => !v); setMode("vector"); setTab("regions"); }} disabled={!sourceDoc}><Scissors size={14}/> {editingRegions ? "Sair da seleção" : "Selecionar regiões"}</button><button type="button" aria-pressed={pan} onClick={() => setPan(v => !v)}>Arrastar área</button><div className="editor-extra-right"><button type="button" onClick={undo} disabled={!undoStack.length} title="Desfazer (Ctrl+Z)"><Undo2 size={15}/> Desfazer</button><button type="button" onClick={redo} disabled={!redoStack.length} title="Refazer (Ctrl+Shift+Z)"><Redo2 size={15}/> Refazer</button></div></div>
      <VectorViewport width={inputImage?.naturalWidth || 1} height={inputImage?.naturalHeight || 1} zoom={zoom} setZoom={setZoom} backdrop={backdrop} pan={pan && !processing}>

        {inputSrc && mode !== "vector" && <img className="viewer-picture" src={inputSrc} alt="Imagem original enviada" draggable={false}/>}
        {svgSrc && mode !== "original" && (!editingRegions || mode !== "vector") && <div className="viewer-vector-layer" style={{ clipPath: mode === "compare" ? `inset(0 0 0 ${split}%)` : "none" }}><img className="viewer-picture" src={svgSrc} alt="Prévia do vetor gerado" draggable={false}/></div>}
        {sourceDoc && editingRegions && mode === "vector" && <div className="viewer-vector-layer"><svg className="editor-region-svg" viewBox={`0 0 ${sourceDoc.width} ${sourceDoc.height}`} xmlns="http://www.w3.org/2000/svg" role="group" aria-label="Regiões vetoriais editáveis">{sourceDoc.paths.map((path, i) => {
          if (edits[i]?.hidden) return null;
          const color = edits[i]?.color ?? path.color;
          const d = pathData(path, Boolean(edits[i]?.rounded), exportStyle.cornerRadius);
          return <path key={i} d={d} fill={exportStyle.drawStyle === "fill" ? color : "none"} fillRule="evenodd" opacity={path.opacity ?? 1} stroke={selected === i ? "#ed673c" : exportStyle.drawStyle === "stroke" ? exportStyle.strokeColor : "transparent"} strokeWidth={selected === i ? Math.max(1, sourceDoc.width / 250) : exportStyle.strokeWidth} vectorEffect="non-scaling-stroke" onClick={() => setSelected(i)} className="editable-region"><title>{`Região ${i+1}, cor ${color}`}</title></path>;
        })}</svg></div>}
        {mode === "compare" && svgSrc && <><div className="split-line" style={{left: `${split}%`}}><span className="split-handle">‹ ›</span></div><input className="split-range" type="range" min="0" max="100" value={split} onChange={e => setSplit(Number(e.target.value))} aria-label="Comparação da imagem original com vetor"/></>}
        {processing && <div className="processing-overlay"><LoaderCircle className="spin" size={27}/><strong>Vetorizando imagem...</strong><span>Criando áreas de cor e curvas vetoriais</span><button type="button" className="btn btn-outline" onClick={() => { activeJob.current?.abort(); setProcessing(false); setCancelled(true); }}>Cancelar processamento</button></div>}
      </VectorViewport>
      {cancelled && <button type="button" className="btn btn-outline" onClick={() => setCancelled(false)}>Retomar processamento</button>}
      <div className="viewer-status"><div><span className="status-dot"/> {processing ? "Processando..." : doc ? "Vetor pronto" : "Preparando imagem..."}{doc && <span className="status-detail"> · {doc.paletteSize} cores · {doc.paths.length} regiões · {doc.nodeCount ?? 0} segmentos</span>}</div><div className="backdrop-switch"><span>Fundo</span><button type="button" aria-label="Fundo quadriculado" className={`bg-swatch checker ${backdrop === "checker" ? "active" : ""}`} onClick={() => setBackdrop("checker")}/><button type="button" aria-label="Fundo branco" className={`bg-swatch white ${backdrop === "white" ? "active" : ""}`} onClick={() => setBackdrop("white")}/><button type="button" aria-label="Fundo escuro" className={`bg-swatch dark ${backdrop === "dark" ? "active" : ""}`} onClick={() => setBackdrop("dark")}/></div></div>
      <div className="viewer-note"><Eye size={17}/>{editingRegions ? "Clique em uma região do vetor para recolorir, arredondar cantos ou remover." : "Compare os pixels com os vetores ou use Selecionar regiões para editar áreas individuais."}</div>
    </section>
    <aside className="editor-sidebar"><div className="sidebar-title"><div><SlidersHorizontal size={18}/><h2>Ferramentas</h2></div><button type="button" onClick={() => {setOptions(DEFAULT_OPTIONS);setExportStyle(DEFAULT_EXPORT_STYLE);commitEdits({});}}>Restaurar</button></div>
      <div className="editor-side-tabs" role="tablist" aria-label="Painéis do editor"><button type="button" role="tab" aria-selected={tab === "palette"} className={tab === "palette" ? "active" : ""} onClick={() => setTab("palette")}>Paleta</button><button type="button" role="tab" aria-selected={tab === "regions"} className={tab === "regions" ? "active" : ""} onClick={() => {setTab("regions");setMode("vector");}}>Regiões</button><button type="button" role="tab" aria-selected={tab === "settings"} className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>Traçado</button></div>
      {tab === "palette" && <div className="editor-panel"><p className="tool-hint">Altere cores individualmente. Use o seletor ao lado para aplicar a nova cor em todas as regiões daquele tom.</p><div className="editor-palette">{palette.map(item => <div className="palette-color-row" key={item.color}><input type="color" aria-label={`Alterar a cor ${item.color}`} value={item.color} onChange={e => { if (validHex.test(e.target.value)) editWholeColor(item.color, { color: e.target.value }); }}/><span><b>{item.color.toUpperCase()}</b><small>{item.count} {item.count === 1 ? "região" : "regiões"}</small></span><button type="button" onClick={() => editWholeColor(item.color, {hidden: true})} aria-label={`Ocultar regiões ${item.color}`} title="Remover esta cor">×</button></div>)}</div><div className="tool-actions"><button type="button" onClick={removeBackground} disabled={!sourceDoc}><WandSparkles size={15}/> Remover fundo provável</button><button type="button" onClick={() => commitEdits({})} disabled={!Object.keys(edits).length}><RotateCcw size={15}/> Restaurar cores</button></div><p className="tool-hint">Remove apenas regiões da cor predominante nas bordas. Áreas internas da mesma cor são preservadas; confira o resultado.</p></div>}
      {tab === "regions" && <div className="editor-panel"><p className="tool-hint">Ative “Selecionar regiões” e clique diretamente em uma forma na prévia.</p><button className="tool-wide-button" type="button" disabled={!sourceDoc} onClick={() => {setEditingRegions(true);setMode("vector");}}><Scissors size={15}/> Ativar seleção de formas</button>{sourceDoc && <><div className="range-label"><label htmlFor="select-region">Região selecionada</label><output>{selected === null ? "Nenhuma" : `${selected + 1}/${sourceDoc.paths.length}`}</output></div><select id="select-region" className="tool-select" value={selected ?? ""} onChange={e => setSelected(e.target.value ? Number(e.target.value) : null)}><option value="">Selecione uma região</option>{sourceDoc.paths.map((region, index) => <option key={index} value={index}>{index + 1} — {region.color} {edits[index]?.hidden ? "(oculta)" : ""}</option>)}</select></>}{selected !== null && sourceDoc?.paths[selected] && <div className="selected-region-panel"><strong>Editar região #{selected+1}</strong><div className="selected-color-control"><label htmlFor="region-color">Preenchimento</label><input id="region-color" type="color" value={edits[selected]?.color ?? sourceDoc.paths[selected].color} onChange={e => changeRegion(selected, { color: e.target.value })}/></div><label className="tool-checkbox"><input type="checkbox" checked={Boolean(edits[selected]?.rounded)} onChange={e => changeRegion(selected, {rounded: e.target.checked})}/> Arredondar os cantos desta região</label><button className="tool-wide-button" type="button" onClick={() => changeRegion(selected, {hidden: !edits[selected]?.hidden})}>{edits[selected]?.hidden ? "Restaurar região" : "Remover região do vetor"}</button></div>}<p className="tool-hint">Os cantos arredondados utilizam curvas cúbicas compartilhadas por SVG, PDF e EPS. Não representam a modelagem geométrica automática do serviço original.</p></div>}
      {tab === "settings" && <div className="editor-panel"><label className="tool-checkbox"><input type="checkbox" checked={options.curves !== false} onChange={e => patch("curves", e.target.checked)}/> Ajustar curvas e elipses</label><p className="tool-hint">Reprocessar o traçado reinicia as edições de regiões e seu histórico.</p><section className="sidebar-control"><div className="range-label"><label htmlFor="colors">Quantidade de cores</label><output>{options.colors}</output></div><input id="colors" type="range" min="2" max="24" step="1" value={options.colors} onChange={e => patch("colors", Number(e.target.value))}/></section><section className="sidebar-control"><div className="range-label"><label htmlFor="detail">Simplificação de contornos</label><output>{options.detail.toFixed(2)}</output></div><input id="detail" type="range" min="0.25" max="2.5" step="0.25" value={options.detail} onChange={e => patch("detail", Number(e.target.value))}/></section><section className="sidebar-control"><div className="range-label"><label htmlFor="smoothing">Redução de ruído</label><output>{["Desligada", "Leve", "Forte"][options.smoothing]}</output></div><input id="smoothing" type="range" min="0" max="2" value={options.smoothing} onChange={e => patch("smoothing", Number(e.target.value))}/></section><section className="sidebar-control"><div className="range-label"><label htmlFor="resolution">Resolução de análise</label><output>{options.resolution} px</output></div><select id="resolution" value={options.resolution} onChange={e => patch("resolution", Number(e.target.value))}><option value="220">Rápido (220 px)</option><option value="340">Equilibrado (340 px)</option><option value="460">Detalhado (460 px)</option></select></section></div>}
      <div className="sidebar-divider"/>
      <section className="export-section"><h2><Download size={18}/> Exportação</h2><label>Perfis de saída</label><div className="export-presets"><button type="button" onClick={() => setPreset("art")}>Arte</button><button type="button" onClick={() => setPreset("cut")}>Corte</button><button type="button" onClick={() => setPreset("engrave")}>Gravação</button></div><label htmlFor="draw-style">Estilo de desenho</label><select id="draw-style" className="tool-select" value={exportStyle.drawStyle} onChange={e => changeStyle({...exportStyle,drawStyle:e.target.value as ExportStyle["drawStyle"]})}><option value="fill">Preencher formas</option><option value="stroke">Traçar contornos</option></select>{exportStyle.drawStyle === "stroke" && <><div className="selected-color-control"><label htmlFor="stroke-color">Cor do traço</label><input id="stroke-color" type="color" value={exportStyle.strokeColor} onChange={e => changeStyle({ ...exportStyle, strokeColor: e.target.value })}/></div><label htmlFor="stroke-width">Espessura de traço (px)</label><input id="stroke-width" type="number" className="tool-number" min="0.1" max="20" step="0.1" value={exportStyle.strokeWidth} onChange={e => { const value=Number(e.target.value);if (Number.isFinite(value) && value>0) changeStyle({...exportStyle,strokeWidth:Math.min(20,value)}); }}/></>}<label htmlFor="export-format">Formato</label><div className="format-select"><select id="export-format" value={format} onChange={e => setFormat(e.target.value as VectorFormat)}><option value="svg">SVG — Vetor editável</option><option value="png">PNG — Imagem raster</option><option value="pdf">PDF — Caminhos vetoriais</option><option value="eps">EPS — Vetores PostScript</option><option value="dxf">DXF — Contornos</option></select><ChevronDown size={15}/></div>{format === "dxf" && <p className="format-note">DXF contém contornos fechados, sem preenchimento. Curvas são aproximadas com erro de até 0,15 unidade; 1 unidade corresponde a 1 pixel original.</p>}{format === "eps" && <p className="format-note">EPS preserva curvas, mas não semitransparência. Para imagens com opacidade parcial, use SVG, PDF ou PNG.</p>}{format === "png" && <p className="format-note">PNG é rasterizado, com até 2400 px no lado maior.</p>}<button type="button" onClick={exportFile} disabled={!doc || processing || downloading || cancelled} className="btn btn-primary export-button">{downloading ? <LoaderCircle size={18} className="spin"/> : <Download size={18}/>} {downloading ? "Exportando..." : `Baixar ${format.toUpperCase()}`}</button><p className="export-free"><Sparkles size={14}/> Gratuito, sem cadastro</p></section>
      {error && <div className="editor-error" role="alert">{error}</div>}
    </aside></div>
    <div className="editor-bottom-notice"><ImageIcon size={16}/> Motor independente: quantização RGBA, contornos e curvas cúbicas. A reconstrução geométrica por IA do Vectorizer.AI não está disponível.</div>
    {cropping && <div className="crop-backdrop" role="presentation"><section className="crop-modal" role="dialog" aria-modal="true" aria-labelledby="crop-title"><h2 id="crop-title"><Crop size={20}/> Pré-recorte de imagem</h2><p>Escolha a região da imagem a processar. A operação gera uma nova imagem local, sem enviar dados para servidores.</p><div className="crop-preview" style={{aspectRatio:inputImage ? `${inputImage.naturalWidth} / ${inputImage.naturalHeight}` : "1"}}>{inputSrc && <img src={inputSrc} alt="Prévia do recorte"/>}<div className="crop-area" style={{left:`${crop.x}%`,top:`${crop.y}%`,width:`${crop.w}%`,height:`${crop.h}%`}}/></div><div className="crop-grid">{(["x", "y", "w", "h"] as const).map(key => <label key={key}>{({x:"Início X (%)",y:"Início Y (%)",w:"Largura (%)",h:"Altura (%)"})[key]}<input type="number" min={key === "x" || key === "y" ? 0 : 1} max={key === "x" ? 99 : key === "y" ? 99 : 100} value={crop[key]} onChange={e => {const n=Number(e.target.value);setCrop(p=>{const next={...p,[key]:Number.isFinite(n)?Math.max(key==="x"||key==="y"?0:1,Math.min(key==="x"||key==="y"?99:100,n)):p[key]};next.w=Math.min(next.w,100-next.x);next.h=Math.min(next.h,100-next.y);return next;});}}/></label>)}</div><div className="crop-actions"><button type="button" onClick={() => setCropping(false)}>Cancelar</button><button type="button" onClick={applyCrop} className="btn btn-primary"><Crop size={15}/> Aplicar recorte</button></div></section></div>}
  </main>;
}
