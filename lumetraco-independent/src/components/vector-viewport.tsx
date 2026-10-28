"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";

type Props = { width: number; height: number; zoom: number; setZoom: (value: number) => void; backdrop: string; pan: boolean; children: ReactNode };
/** Zoom is measured in source-image pixels. Fit is a separate explicit operation. */
export function VectorViewport({ width, height, zoom, setZoom, backdrop, pan, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 500 });
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  const fit = Math.min((size.width - 32) / width, (size.height - 32) / height, 1) * 100;
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoom(Math.max(10, Math.min(800, (zoom || fit) * Math.exp(-event.deltaY * 0.002))));
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [zoom, fit, setZoom]);
  const scale = (zoom === 0 ? fit : zoom) / 100;
  return <div className={`viewer-stage viewer-stage--${backdrop}`}>
    <div ref={ref} className={`vector-viewport ${pan ? "is-panning" : ""}`} aria-label="Área de visualização" onPointerDown={event => {
      if (!pan || event.button !== 0) return;
      event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { x: event.clientX, y: event.clientY, left: event.currentTarget.scrollLeft, top: event.currentTarget.scrollTop };
    }} onPointerMove={event => {
      if (!drag.current) return;
      event.currentTarget.scrollLeft = drag.current.left - event.clientX + drag.current.x;
      event.currentTarget.scrollTop = drag.current.top - event.clientY + drag.current.y;
    }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      <div className="vector-viewport-inner" style={{ width: Math.max(size.width, width * scale + 32), height: Math.max(size.height, height * scale + 32) }}>
        <div className="viewer-canvas" style={{ width: width * scale, height: height * scale, pointerEvents: pan ? "none" : "auto" }}>{children}</div>
      </div>
    </div>
  </div>;
}
