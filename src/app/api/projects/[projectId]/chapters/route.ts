import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createChapterSchema } from "@/lib/validators/chapter";

interface Params {
  params: Promise<{ projectId: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { projectId } = await params;
  const chapters = await prisma.chapter.findMany({
    where: { projectId },
    orderBy: { order: "asc" },
  });
  return NextResponse.json({ chapters });
}

export async function POST(request: Request, { params }: Params) {
  const { projectId } = await params;
  const body = await request.json();
  const input = createChapterSchema.parse(body);
  const count = await prisma.chapter.count({ where: { projectId } });
  const chapter = await prisma.chapter.create({
    data: {
      projectId,
      order: count + 1,
      title: input.title,
    },
  });
  return NextResponse.json({ chapter }, { status: 201 });
}
