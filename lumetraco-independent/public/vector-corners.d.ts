import type { Command } from './vector-geometry';
export function candidates(commands: Command[]): {id:number;x:number;y:number;maxRadius:number}[];
export function apply(commands: Command[], radii?: Record<number,number>): Command[];
