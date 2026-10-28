export type Command = ['M' | 'L', number, number] | ['C', number, number, number, number, number, number] | ['Z'];
export type GeometryOptions = { curves?: boolean; rounded?: boolean; radius?: number; tolerance?: number };
export function loopCommands(loop: number[], options?: GeometryOptions): Command[];
export function pathCommands(path: { loops: number[][]; commands?: Command[] }, options?: GeometryOptions): Command[];
export function toSvg(commands: Command[]): string;
export function flatten(commands: Command[], tolerance?: number): number[][];
