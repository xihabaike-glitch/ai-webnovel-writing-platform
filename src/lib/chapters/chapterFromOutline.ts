import type { Prisma } from "@prisma/client";
import type { PlatformProfile } from "@/lib/platforms/platformProfiles";

export class OutlineNodeAlreadyClaimedError extends Error {
  constructor() {
    super("Outline node was already claimed by another chapter request.");
    this.name = "OutlineNodeAlreadyClaimedError";
  }
}

export async function claimOutlineNodeForChapter(
  transaction: Pick<Prisma.TransactionClient, "outlineNode">,
  input: {
    outlineNodeId: string;
    projectId: string;
    chapterId: string;
  },
) {
  const claim = await transaction.outlineNode.updateMany({
    where: {
      id: input.outlineNodeId,
      projectId: input.projectId,
      chapterId: null,
    },
    data: {
      chapterId: input.chapterId,
      status: "chapter_card",
    },
  });
  if (claim.count !== 1) {
    throw new OutlineNodeAlreadyClaimedError();
  }
}

export interface ChapterFromOutlineInput {
  projectTitle: string;
  platform: PlatformProfile;
  outlineNode: {
    type: string;
    title: string;
    summary: string;
    goal: string;
    hook: string;
    conflict: string;
    valueShift: string;
    platformNote: string;
  };
  nextOrder: number;
}

export interface ChapterCardDraft {
  title: string;
  goal: string;
  hook: string;
  conflict: string;
  valueShift: string;
  cliffhanger: string;
  status: "outline";
}

const typeTitlePrefixes: Record<string, string> = {
  opening: "开局",
  ending: "终局",
  trunk: "主线",
  branch: "支线",
  leaf: "场景",
  soil: "设定",
  root: "总纲",
};

function compactText(text: string, fallback: string) {
  return text.trim() || fallback;
}

export function buildChapterCardFromOutline(input: ChapterFromOutlineInput): ChapterCardDraft {
  const prefix = typeTitlePrefixes[input.outlineNode.type] ?? "章节";
  const title = `第${input.nextOrder}章 ${prefix}：${input.outlineNode.title}`.slice(0, 120);
  const platformFocus = input.platform.reviewFocus.slice(0, 2).join("、");
  const platformRule = input.platform.openingRules[0] ?? "开头必须快速给出明确期待";

  return {
    title,
    goal: compactText(
      input.outlineNode.goal,
      `把《${input.projectTitle}》的“${input.outlineNode.title}”推进成一个可交付章节。`,
    ),
    hook: compactText(input.outlineNode.hook, platformRule),
    conflict: compactText(input.outlineNode.conflict, "给主角一个不能绕开的当场阻碍。"),
    valueShift: compactText(input.outlineNode.valueShift, "让局面从稳定转向失控，或从被动转向主动。"),
    cliffhanger: `章末必须留下一个和“${input.outlineNode.title}”直接相关的新问题；优先检查：${platformFocus}。`,
    status: "outline",
  };
}
