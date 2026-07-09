import { NextResponse } from "next/server";
import { mapChapterGenerationError, mapChapterGenerationFailure } from "@/lib/ai/chapterGenerationHttp";
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
      const mapped = mapChapterGenerationFailure(result);
      return NextResponse.json(mapped.body, { status: mapped.status });
    }

    return NextResponse.json({
      task: result.task,
      chapter: result.chapter,
      candidateRevision: result.candidateRevision,
      content: result.content,
      activeProvider: result.activeProvider,
      secondPassAudit: result.secondPassAudit,
      storyTreeExperienceEffects: result.storyTreeExperienceEffects,
      storyTreeDispatches: result.storyTreeDispatches,
      attempts: result.attempts,
    });
  } catch (caught) {
    const mapped = mapChapterGenerationError(caught, "Unknown second pass error");
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
