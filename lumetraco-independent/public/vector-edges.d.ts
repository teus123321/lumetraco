import type { Command } from './vector-geometry';
export type Edge = {a: number[]; c: Command; regions: number[]};
export function unique(paths: {commands?: Command[]}[]): Edge[];
export function union(paths: {commands?: Command[]}[]): Command[];
export function segments(commands: Command[]): Edge[];

export function gapSvg(paths: {color:string; opacity?:number; commands?:Command[]}[]): string;
