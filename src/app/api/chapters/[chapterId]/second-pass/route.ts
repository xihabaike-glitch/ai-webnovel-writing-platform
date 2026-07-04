import { NextResponse } from "next/server";
import {
  generateChapterSecondPass,
  normalizeSecondPassMode,
  type SecondPassMode,
} from "@/lib/ai/chapterSecondPassGeneration";

interface Params {
  params: Promise<{ chapterId: string }>;
}

interface SecondPassBody {
  instruction?: string;
  mode?: SecondPassMode;
  targetWords?: number;
}

export async function POST(request: Request, { params }: Params) {
  const { chapterId } = await params;
  const body = (await request.json().catch(() => ({}))) as SecondPassBody;
  const instruction = body.instruction?.trim();

  if (!instruction) {
    return NextResponse.json({ error: "instruction is required" }, { status: 400 });
  }

  try {
    const result = await generateChapterSecondPass({
      chapterId,
      instruction,
      mode: normalizeSecondPassMode(body.mode),
      targetWords: body.targetWords,
    });
    if ("error" in result) {
      const error = result.error ?? "二改失败。";
      return NextResponse.json({ task: result.task, error, budgetGuard: result.budgetGuard }, { status: error.startsWith("预算拦截") ? 429 : 500 });
    }

    return NextResponse.json({
      task: result.task,
      chapter: result.chapter,
      content: result.content,
      activeProvider: result.activeProvider,
      secondPassAudit: result.secondPassAudit,
      storyTreeDispatches: result.storyTreeDispatches,
      attempts: result.attempts,
    });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Unknown second pass error";
    const status = message === "Chapter not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
