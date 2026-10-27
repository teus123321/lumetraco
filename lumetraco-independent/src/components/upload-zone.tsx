"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, ImagePlus, LockKeyhole, UploadCloud } from "lucide-react";
import { useImageSession } from "./image-session";

export function UploadZone({ compact = false }: {compact?: boolean}) {
  const router = useRouter(), { setFile } = useImageSession();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  function accept(file?: File) {
    if (!file) return;
    if (!/\.(png|jpe?g|gif|bmp|webp)$/i.test(file.name) && !["image/png", "image/jpeg", "image/gif", "image/bmp", "image/webp"].includes(file.type)) {
      setError("Escolha uma imagem PNG, JPG, GIF, BMP ou WebP."); return;
    }
    if (file.size > 30 * 1024 * 1024) { setError("O tamanho máximo do arquivo é 30 MB."); return; }
    setError(""); setFile(file); router.push("/editor");
  }
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) return;
      const file = Array.from(e.clipboardData?.files || []).find(f => f.type.startsWith("image/"));
      if (file) { e.preventDefault(); accept(file); }
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  // A clipboard image triggers the same validated upload flow.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, setFile]);
  async function sample() {
    setBusy(true); setError("");
    try {
      const res = await fetch("/demo-art.png");
      if (!res.ok) throw new Error("Não foi possível carregar a imagem de exemplo.");
      accept(new File([await res.blob()], "sample-landscape.png", { type: "image/png" }));
    } catch (e) { setError(e instanceof Error ? e.message : "Imagem de exemplo indisponível."); }
    finally { setBusy(false); }
  }
  return <div className={compact ? "upload-wrap upload-wrap--compact" : "upload-wrap"}>
    <div className={`upload-zone ${dragging ? "upload-zone--drag" : ""}`} role="button" tabIndex={0} aria-label="Selecionar imagem para vetorizar" onClick={() => input.current?.click()} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); input.current?.click(); } }} onDragEnter={e => { e.preventDefault(); setDragging(true); }} onDragOver={e => e.preventDefault()} onDragLeave={e => { e.preventDefault(); setDragging(false); }} onDrop={e => { e.preventDefault(); setDragging(false); accept(e.dataTransfer.files[0]); }}>
      <input ref={input} type="file" hidden accept="image/png,image/jpeg,image/gif,image/bmp,image/webp,.bmp" onChange={e => { accept(e.target.files?.[0]); e.target.value = ""; }} aria-label="Arquivo de imagem"/>
      <span className="upload-icon"><UploadCloud size={28} strokeWidth={1.7}/></span>
      <h2>Arraste sua imagem para cá</h2>
      <p>ou cole com <kbd>Ctrl</kbd> + <kbd>V</kbd></p>
      <span className="btn btn-primary upload-action"><ImagePlus size={18}/> Criar vetor <ArrowUpRight size={17}/></span>
      <span className="upload-formats">PNG · JPG · GIF · BMP · WEBP <span aria-hidden="true">→</span> SVG · PDF · EPS · DXF</span>
    </div>
    {error && <p role="alert" className="upload-error">{error}</p>}
    <div className="upload-meta"><span><LockKeyhole size={14}/> Imagem processada no seu dispositivo.</span><button type="button" className="link-button" disabled={busy} onClick={sample}>{busy ? "Carregando…" : "Testar com uma imagem de exemplo"} <ArrowUpRight size={14}/></button></div>
  </div>;
}
