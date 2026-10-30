import type {Command} from './vector-geometry';
export function translatedMatches(paths:{commands?:Command[]}[],index:number,tolerance?:number):number[];
export function symmetry(commands:Command[],axis:'x'|'y',tolerance?:number):{error:number;center:number;commands:Command[]}|null;
