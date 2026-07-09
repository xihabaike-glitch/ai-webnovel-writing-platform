import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { createChapterSchema } from "@/lib/validators/chapter";
import { ChapterOrderConflictError, createWithNextChapterOrder } from "@/lib/chapters/chapterOrder";

interface Params {
  params: Promise<{ projectId: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { projectId } = await params;
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
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
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }
  let chapter;
  try {
    chapter = await createWithNextChapterOrder(projectId, (tx, order) => tx.chapter.create({
      data: { projectId, order, title: input.title },
    }));
  } catch (error) {
    if (error instanceof ChapterOrderConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    throw error;
  }
  return NextResponse.json({ chapter }, { status: 201 });
}
