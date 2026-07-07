import { NextResponse } from "next/server";
import { platformDeliveryScope, platformProfiles } from "@/lib/platforms/platformProfiles";

export async function GET() {
  return NextResponse.json({ platforms: platformProfiles, deliveryScope: platformDeliveryScope });
}
