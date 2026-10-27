export type VectorOptions = { colors: number; detail: number; smoothing: number; resolution: number };
export type VectorPath = { color: string; loops: number[][] };
export type VectorDocument = {
  svg: string;
  paths: VectorPath[];
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  totalLoops: number;
  paletteSize: number;
  drawStyle?: "fill" | "stroke";
  strokeWidth?: number;
  strokeColor?: string;
};
export const DEFAULT_OPTIONS: VectorOptions = { colors: 10, detail: 0.85, smoothing: 1, resolution: 340 };
export type VectorFormat = "svg" | "png" | "pdf" | "eps" | "dxf";
