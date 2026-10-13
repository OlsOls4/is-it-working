import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/youcam";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ demo: isDemoMode(), accessCodeRequired: !isDemoMode() && !!process.env.LIVE_ACCESS_CODE });
}
