import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { updateOutlineNodeSchema } from "@/lib/validators/outline";

interface Params {
  params: Promise<{ nodeId: string }>;
}

export async function PATCH(request: Request, { params }: Params) {
  const { nodeId } = await params;
  const body = await request.json();
  const input = updateOutlineNodeSchema.parse(body);

  const node = await prisma.outlineNode.update({
    where: { id: nodeId },
    data: input,
  });

  return NextResponse.json({ node });
}
