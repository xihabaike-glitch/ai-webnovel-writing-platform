import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  const providers = await prisma.modelProvider.findMany({
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ providers });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    providerId: string;
    displayName: string;
    baseUrl?: string;
    defaultModel: string;
    maxContextTokens?: number;
  };

  const provider = await prisma.modelProvider.create({
    data: {
      providerId: body.providerId,
      displayName: body.displayName,
      baseUrl: body.baseUrl,
      defaultModel: body.defaultModel,
      maxContextTokens: body.maxContextTokens,
      enabled: true,
    },
  });

  return NextResponse.json({ provider }, { status: 201 });
}

