import { NextResponse } from "next/server";
import { summarizeChapterRevisions } from "@/lib/chapters/revisions";
import { prisma } from "@/lib/db/prisma";

interface Params {
  params: Promise<{ chapterId: string }>;
}

export async function GET(_request: Request, { params }: Params) {
  const { chapterId } = await params;
  const revisions = await prisma.chapterRevision.findMany({
    where: { chapterId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({ revisions: summarizeChapterRevisions(revisions) });
}

export async function POST(request: Request, { params }: Params) {
  const { chapterId } = await params;
  const body = (await request.json().catch(() => ({}))) as { notes?: string };
  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
  });

  if (!chapter) {
    return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
  }

  const revision = await prisma.chapterRevision.create({
    data: {
      chapterId: chapter.id,
      source: "manual_snapshot",
      title: chapter.title,
      content: chapter.content,
      wordCount: chapter.wordCount,
      goal: chapter.goal,
      hook: chapter.hook,
      conflict: chapter.conflict,
      valueShift: chapter.valueShift,
      cliffhanger: chapter.cliffhanger,
      status: chapter.status,
      notes: body.notes ?? "手动保存快照。",
    },
  });

  return NextResponse.json({ revision: summarizeChapterRevisions([revision])[0] }, { status: 201 });
}
