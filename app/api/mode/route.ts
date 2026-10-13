import { NextResponse } from "next/server";
import { liveConfigured, liveGate } from "@/lib/youcam";

export const dynamic = "force-dynamic";

/**
 * GET /api/mode (send x-access-code to check a code)
 * -> { demo: is THIS browser served recorded results, liveConfigured: key + DEMO_MODE=0 on the server,
 *      accessCodeRequired, accessOk, reason }
 */
export function GET(req: Request) {
  const gate = liveGate(req);
  return NextResponse.json({
    demo: !gate.live,
    liveConfigured: liveConfigured(),
    accessCodeRequired: liveConfigured(),
    accessOk: gate.live,
    reason: gate.live ? "live" : gate.reason,
  });
}
