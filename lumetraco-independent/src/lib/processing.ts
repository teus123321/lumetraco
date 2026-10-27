import type { VectorDocument, VectorOptions } from "./types";

export async function loadImage(file: File): Promise<{ url: string; image: HTMLImageElement }> {
  const accepted = ["image/png", "image/jpeg", "image/webp", "image/gif", "image/bmp"];
  if (!accepted.includes(file.type) && !/\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name)) {
    throw new Error("Unsupported file format. Please select PNG, JPG, GIF, BMP or WebP.");
  }
  if (file.size > 30 * 1024 * 1024) throw new Error("Maximum file size is 30 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (image.naturalWidth * image.naturalHeight > 20_000_000) throw new Error("Maximum input size is 20 megapixels.");
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
  if (!ctx) return Promise.reject(new Error("Canvas is not available in this browser."));
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height).data;
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(new DOMException("Cancelled", "AbortError")); return; }
    const worker = new Worker("/vector-worker.js");
    const onAbort = () => { worker.terminate(); reject(new DOMException("Cancelled", "AbortError")); };
    signal?.addEventListener("abort", onAbort, { once: true });
    function finish() { worker.terminate(); signal?.removeEventListener("abort", onAbort); }
    worker.onmessage = (ev: MessageEvent<{type: "done" | "error"; result?: VectorDocument; message?: string}>) => {
      finish();
      if (ev.data.type === "done" && ev.data.result) resolve(ev.data.result);
      else reject(new Error(ev.data.message || "Vectorization failed."));
    };
    worker.onerror = () => { finish(); reject(new Error("Worker could not process this image.")); };
    worker.postMessage({ pixels, width, height, outputWidth: image.naturalWidth, outputHeight: image.naturalHeight, options }, [pixels.buffer]);
  });
}
