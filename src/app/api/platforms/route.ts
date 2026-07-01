import { NextResponse } from "next/server";
import { platformProfiles } from "@/lib/platforms/platformProfiles";

export async function GET() {
  return NextResponse.json({ platforms: platformProfiles });
}

