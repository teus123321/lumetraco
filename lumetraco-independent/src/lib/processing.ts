import type { VectorDocument, VectorOptions } from "./types";

export async function loadImage(file: File): Promise<{ url: string; image: HTMLImageElement }> {
  const accepted = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp"];
  if (!accepted.includes(file.type) && !/\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name)) {
    throw new Error("Formato não suportado. Selecione PNG, JPG, GIF, BMP ou WebP.");
  }
  if (file.size > 30 * 1024 * 1024) throw new Error("O tamanho máximo é de 30 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (image.naturalWidth * image.naturalHeight > 20_000_000) throw new Error("A imagem pode ter no máximo 20 megapixels.");
    return { url, image };
  } catch (error) { URL.revokeObjectURL(url); throw error; }
}

export function vectorizeImage(image: HTMLImageElement, options: VectorOptions, signal?: AbortSignal): Promise<VectorDocument> {
  const factor = Math.min(1, options.resolution / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * factor));
  const height = Math.max(1, Math.round(image.naturalHeight * factor));
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return Promise.reject(new Error("Seu navegador não disponibilizou a área de desenho."));
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height).data;
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException("Cancelled", "AbortError")); return; }
    const worker = new Worker("/vector-worker.js");
    const timeout = window.setTimeout(() => { finish(); reject(new Error("O processamento excedeu 30 segundos. Reduza a resolução ou a quantidade de cores.")); }, 30000);
    const onAbort = () => { finish(); reject(new DOMException("Cancelled", "AbortError")); };
    signal?.addEventListener("abort", onAbort, { once: true });
    function finish() { window.clearTimeout(timeout); worker.terminate(); signal?.removeEventListener("abort", onAbort); }
    worker.onmessage = (ev: MessageEvent<{type: "done" | "error"; result?: VectorDocument; message?: string}>) => {
      finish();
      if (ev.data.type === "done" && ev.data.result) resolve(ev.data.result);
      else reject(new Error(ev.data.message || "Não foi possível vetorizar a imagem."));
    };
    worker.onerror = () => { finish(); reject(new Error("O processamento local da imagem falhou.")); };
    worker.postMessage({ pixels, width, height, outputWidth: image.naturalWidth, outputHeight: image.naturalHeight, options }, [pixels.buffer]);
  });
}
