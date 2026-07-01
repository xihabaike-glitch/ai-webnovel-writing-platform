import type { PlatformProfile } from "../platforms/platformProfiles.ts";
import type { SubmissionChecklist } from "./submissionChecklist.ts";

export interface FirstDayProject {
  id: string;
  title: string;
  currentWordCount: number;
}

export interface FirstDayChapter {
  id: string;
  order: number;
  title: string;
  content: string;
  wordCount: number;
  goal: string;
  hook: string;
  conflict: string;
  valueShift: string;
  cliffhanger: string;
}

export interface FirstDayOutlineNode {
  type: string;
}

export interface FirstDayCharacter {
  name: string;
  role: string;
  desire: string;
  need: string;
  flaw: string;
  arcStart: string;
  arcEnd: string;
  voice: string;
}

export interface FirstDayWorldEntry {
  type: string;
  title: string;
  content: string;
}

export interface FirstDayAiTask {
  chapterId: string | null;
  taskType: string;
  status: string;
}

export interface FirstDayWorkflowInput {
  project: FirstDayProject;
  platform: PlatformProfile;
  chapters: FirstDayChapter[];
  outlineNodes: FirstDayOutlineNode[];
  characters: FirstDayCharacter[];
  worldEntries: FirstDayWorldEntry[];
  aiTasks: FirstDayAiTask[];
  submissionChecklist: SubmissionChecklist;
}

export interface FirstDayWorkflowStep {
  id: string;
  label: string;
  status: "done" | "active" | "locked";
  owner: "策划" | "作者" | "AI" | "运营";
  evidence: string;
  instruction: string;
  actionLabel: string;
  href: string;
}

export interface FirstDayWorkflow {
  title: string;
  platformName: string;
  completedCount: number;
  totalSteps: number;
  progressPercent: number;
  verdict: string;
  nextStep: FirstDayWorkflowStep;
  steps: FirstDayWorkflowStep[];
}

function compact(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function hasText(text: string, minLength = 1) {
  return compact(text).length >= minLength;
}

function firstChapter(chapters: FirstDayChapter[]) {
  return [...chapters].sort((left, right) => left.order - right.order)[0] ?? null;
}

function hasSucceededTask(tasks: FirstDayAiTask[], taskType: string, chapterId?: string) {
  return tasks.some((task) => (
    task.taskType === taskType
    && task.status === "succeeded"
    && (!chapterId || task.chapterId === chapterId)
  ));
}

function outlineReady(nodes: FirstDayOutlineNode[]) {
  const types = new Set(nodes.map((node) => node.type));
  return ["root", "opening", "ending", "trunk", "branch", "leaf", "soil"].every((type) => types.has(type));
}

function characterReady(characters: FirstDayCharacter[]) {
  return characters.some((character) => (
    hasText(character.name)
    && hasText(character.role)
    && hasText(character.desire)
    && hasText(character.need)
    && hasText(character.flaw)
    && hasText(character.arcStart)
    && hasText(character.arcEnd)
    && hasText(character.voice)
  ));
}

function worldReady(entries: FirstDayWorldEntry[]) {
  const types = new Set(entries.map((entry) => entry.type));
  const hasCoreTypes = ["system_rule", "taboo", "platform_soil"].every((type) => types.has(type));
  const completeEntries = entries.filter((entry) => (
    hasText(entry.title) && hasText(entry.content, 40)
  )).length;
  return hasCoreTypes && completeEntries >= 3;
}

function chapterCardReady(chapter: FirstDayChapter | null) {
  if (!chapter) return false;
  return [chapter.goal, chapter.hook, chapter.conflict, chapter.valueShift, chapter.cliffhanger].every((field) => hasText(field));
}

function status(complete: boolean, unlocked: boolean): FirstDayWorkflowStep["status"] {
  if (complete) return "done";
  if (unlocked) return "active";
  return "locked";
}

function step(input: Omit<FirstDayWorkflowStep, "status"> & { complete: boolean; unlocked: boolean }): FirstDayWorkflowStep {
  const { complete, unlocked, ...rest } = input;
  return {
    ...rest,
    status: status(complete, unlocked),
  };
}

function verdict(completedCount: number, totalSteps: number) {
  if (completedCount === totalSteps) return "首日链路已跑通，可以进入批量生产和平台投放准备。";
  if (completedCount >= 4) return "首日链路过半，先把审稿和二改补完，别急着开新坑。";
  if (completedCount >= 2) return "项目骨架已经有了，下一步要把第一章变成可审稿正文。";
  return "新书还在冷启动，先把大纲、人物、设定和第一章钩子咬住。";
}

export function buildFirstDayWorkflow(input: FirstDayWorkflowInput): FirstDayWorkflow {
  const chapter = firstChapter(input.chapters);
  const projectHref = `/projects/${input.project.id}`;
  const firstChapterHref = chapter ? `${projectHref}/chapters/${chapter.id}` : projectHref;
  const structureComplete = outlineReady(input.outlineNodes) && input.chapters.length >= 3;
  const characterComplete = characterReady(input.characters);
  const worldComplete = worldReady(input.worldEntries);
  const hookComplete = chapterCardReady(chapter);
  const draftComplete = Boolean(chapter && chapter.wordCount > 0) || hasSucceededTask(input.aiTasks, "chapter_draft", chapter?.id);
  const reviewComplete = hasSucceededTask(input.aiTasks, "chapter_review", chapter?.id);
  const rewriteComplete = hasSucceededTask(input.aiTasks, "chapter_second_pass", chapter?.id)
    || hasSucceededTask(input.aiTasks, "first_three_rewrite");
  const exportComplete = input.submissionChecklist.readinessPercent >= 70 && draftComplete && reviewComplete;
  const supportComplete = characterComplete && worldComplete;

  const steps = [
    step({
      id: "skeleton",
      label: "作品骨架落地",
      owner: "策划",
      complete: structureComplete,
      unlocked: true,
      evidence: `${input.outlineNodes.length} 个大纲节点，${input.chapters.length} 张章节卡。`,
      instruction: "确认开头、结尾、主干、分支、叶片和土壤都已经生成。",
      actionLabel: "看项目总控",
      href: `${projectHref}#project-control`,
    }),
    step({
      id: "opening-hook",
      label: "第一章钩子确认",
      owner: "作者",
      complete: hookComplete,
      unlocked: structureComplete,
      evidence: chapter ? `第一章：${chapter.title}。钩子：${chapter.hook || "未填写"}。` : "还没有第一章。",
      instruction: `按${input.platform.name}开头规则，把目标、钩子、冲突、转变、章末悬念补完整。`,
      actionLabel: "打开第一章",
      href: firstChapterHref,
    }),
    step({
      id: "story-support",
      label: "人物和设定支撑",
      owner: "策划",
      complete: supportComplete,
      unlocked: hookComplete,
      evidence: `${input.characters.length} 个人物，${input.worldEntries.length} 条设定。`,
      instruction: "确认主角欲望、需求、缺陷、起点终点，以及系统规则、禁忌、平台土壤。",
      actionLabel: "补人物设定",
      href: `${projectHref}#character-arc`,
    }),
    step({
      id: "first-draft",
      label: "生成第一章正文",
      owner: "AI",
      complete: draftComplete,
      unlocked: hookComplete && supportComplete,
      evidence: chapter ? `${chapter.wordCount} 字正文，初稿任务${hasSucceededTask(input.aiTasks, "chapter_draft", chapter.id) ? "已成功" : "未完成"}。` : "还没有可生成的章节。",
      instruction: "用章节卡生成正文，先跑一章验证平台语气和节奏。",
      actionLabel: "生成第一章",
      href: firstChapterHref,
    }),
    step({
      id: "first-review",
      label: "第一章审稿",
      owner: "AI",
      complete: reviewComplete,
      unlocked: draftComplete,
      evidence: reviewComplete ? "第一章已有成功审稿任务。" : "第一章还没有成功审稿记录。",
      instruction: "先审第一章的钩子、爽点、冲突、解释密度和章末追读。",
      actionLabel: "去审稿",
      href: firstChapterHref,
    }),
    step({
      id: "first-rewrite",
      label: "二改或前三章改写",
      owner: "AI",
      complete: rewriteComplete,
      unlocked: reviewComplete,
      evidence: rewriteComplete ? "已有二改或前三章改写结果。" : "还没有二改或前三章改写结果。",
      instruction: "按审稿问题做二改，再决定是否启动前三章整体改写。",
      actionLabel: "启动二改",
      href: firstChapterHref,
    }),
    step({
      id: "publish-precheck",
      label: "平台包预检",
      owner: "运营",
      complete: exportComplete,
      unlocked: draftComplete,
      evidence: `投稿准备度 ${input.submissionChecklist.readinessPercent}%。`,
      instruction: "生成简介、标签、卖点、样章和平台风险清单，准备小范围投放或投稿。",
      actionLabel: "看平台导出",
      href: `${projectHref}#platform-export`,
    }),
  ];
  const completedCount = steps.filter((item) => item.status === "done").length;
  const nextStep = steps.find((item) => item.status === "active") ?? steps.find((item) => item.status === "locked") ?? steps[steps.length - 1];

  return {
    title: "首日工作流",
    platformName: input.platform.name,
    completedCount,
    totalSteps: steps.length,
    progressPercent: Math.round((completedCount / steps.length) * 100),
    verdict: verdict(completedCount, steps.length),
    nextStep,
    steps,
  };
}
