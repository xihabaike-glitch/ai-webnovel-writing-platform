export interface StoryLineChapter {
  id: string;
  order: number;
  title: string;
}

export interface StoryLineForeshadow {
  id: string;
  title: string;
  setupChapterId: string | null;
  payoffChapterId: string | null;
  relatedCharacterIds: string;
  status: string;
  notes: string;
}

export interface StoryLinePlotThread {
  id: string;
  type: string;
  title: string;
  startChapterId: string | null;
  endChapterId: string | null;
  status: string;
}

export interface StoryLineSummary {
  id: string;
  title: string;
  status: "complete" | "partial" | "risk";
  evidence: string;
  suggestion: string;
}

export interface StoryLineDashboard {
  foreshadowTotal: number;
  foreshadowReady: number;
  threadTotal: number;
  threadResolved: number;
  summaries: StoryLineSummary[];
  warnings: string[];
  nextActions: string[];
}

function chapterLabel(chapters: StoryLineChapter[], chapterId: string | null) {
  const chapter = chapters.find((item) => item.id === chapterId);
  return chapter ? `第 ${chapter.order} 章 ${chapter.title}` : "未绑定章节";
}

function summarizeForeshadow(foreshadow: StoryLineForeshadow, chapters: StoryLineChapter[]): StoryLineSummary {
  const hasSetup = Boolean(foreshadow.setupChapterId || foreshadow.notes.trim());
  const hasPayoff = Boolean(foreshadow.payoffChapterId || foreshadow.status === "paid_off");
  const status = hasSetup && hasPayoff ? "complete" : hasSetup ? "partial" : "risk";

  return {
    id: foreshadow.id,
    title: foreshadow.title,
    status,
    evidence: `埋点：${chapterLabel(chapters, foreshadow.setupChapterId)}；回收：${chapterLabel(chapters, foreshadow.payoffChapterId)}；状态：${foreshadow.status}。`,
    suggestion: status === "complete"
      ? "伏笔有埋有收，可以继续绑定到人物或主线反转。"
      : hasSetup
        ? "已经有埋点，必须指定回收章或把状态改为已回收。"
        : "先指定埋点章，不要让反转凭空出现。",
  };
}

function summarizeThread(thread: StoryLinePlotThread, chapters: StoryLineChapter[]): StoryLineSummary {
  const hasStart = Boolean(thread.startChapterId);
  const hasEnd = Boolean(thread.endChapterId || thread.status === "resolved");
  const status = hasStart && hasEnd ? "complete" : hasStart ? "partial" : "risk";

  return {
    id: thread.id,
    title: thread.title,
    status,
    evidence: `类型：${thread.type}；起点：${chapterLabel(chapters, thread.startChapterId)}；终点：${chapterLabel(chapters, thread.endChapterId)}；状态：${thread.status}。`,
    suggestion: status === "complete"
      ? "剧情线有起有落，可以检查是否回收到终局。"
      : hasStart
        ? "剧情线已有起点，补阶段终点或标记当前仍在推进。"
        : "先绑定起始章节，否则这条线只是标签。",
  };
}

export function buildStoryLineDashboard(
  chapters: StoryLineChapter[],
  foreshadows: StoryLineForeshadow[],
  plotThreads: StoryLinePlotThread[],
): StoryLineDashboard {
  const foreshadowSummaries = foreshadows.map((foreshadow) => summarizeForeshadow(foreshadow, chapters));
  const threadSummaries = plotThreads.map((thread) => summarizeThread(thread, chapters));
  const summaries = [...foreshadowSummaries, ...threadSummaries];
  const foreshadowReady = foreshadowSummaries.filter((summary) => summary.status === "complete").length;
  const threadResolved = threadSummaries.filter((summary) => summary.status === "complete").length;
  const warnings: string[] = [];

  if (foreshadows.length === 0) warnings.push("还没有伏笔，后续反转容易变成临时解释。");
  if (plotThreads.length === 0) warnings.push("还没有主线/支线，长篇推进会缺少阶段目标。");
  if (foreshadows.some((item) => item.setupChapterId && !item.payoffChapterId && item.status !== "paid_off")) {
    warnings.push("存在只埋不收的伏笔，后期会变成读者的信任成本。");
  }
  if (plotThreads.some((item) => !item.startChapterId)) {
    warnings.push("存在未绑定起点的剧情线，无法判断它从哪里开始发力。");
  }
  if (chapters.length < 3) {
    warnings.push("章节数量不足，伏笔和支线只能先做结构预埋。");
  }

  return {
    foreshadowTotal: foreshadows.length,
    foreshadowReady,
    threadTotal: plotThreads.length,
    threadResolved,
    summaries,
    warnings,
    nextActions: [
      foreshadows.length === 0 ? "先创建一个会在前三章埋下的核心伏笔。" : "把未回收伏笔绑定到明确回收章。",
      plotThreads.length === 0 ? "先创建一条主线，再补一条反派压力线或关系情绪线。" : "给每条剧情线补起点章和阶段终点。",
      "每次新增反转都要同时填写埋点章、回收章和影响人物。",
    ],
  };
}
