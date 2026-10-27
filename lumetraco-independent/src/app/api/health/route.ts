import { NextResponse } from "next/server";
export function GET() { return NextResponse.json({ status: "ok", service: "lumetraco", engine: "browser-worker", persistence: false, paidServices: false }); }
