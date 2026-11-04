import { NextResponse } from "next/server";
import { processDueReferrals } from "@/lib/rewards";

/** Daily job (Vercel Cron): pays referral rewards whose validation window has passed. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  return NextResponse.json(await processDueReferrals());
}
