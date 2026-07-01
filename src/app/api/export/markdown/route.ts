import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { exportProjectMarkdown } from "@/lib/export/markdown";

export async function POST(request: Request) {
  const body = (await request.json()) as { projectId: string };
  const project = await prisma.project.findUnique({
    where: { id: body.projectId },
    include: { chapters: { orderBy: { order: "asc" } } },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const markdown = exportProjectMarkdown({
    title: project.title,
    chapters: project.chapters.map((chapter) => ({
      order: chapter.order,
      title: chapter.title,
      content: chapter.content,
    })),
  });

  return new NextResponse(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${encodeURIComponent(project.title)}.md"`,
    },
  });
}

