"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface ChapterProductionItem {
  id: string;
  outlineNodeId: string | null;
  chapterId: string | null;
  order: number;
  stage: string;
  title: string;
  status: "blocked" | "outline_ready" | "card_ready" | "drafting" | "done";
  goal: string;
  hook: string;
  conflict: string;
  cliffhanger: string;
  primaryCharacter: string;
  worldAnchors: string[];
  lineBeats: string[];
  missingFields: string[];
  action: string;
  quickFix: ChapterProductionQuickFix | null;
}

interface ChapterProductionQuickFix {
  id: string;
  label: string;
  description: string;
  method: "PATCH";
  endpoint: string;
  payload: Record<string, string>;
}

interface ChapterProductionDashboard {
  totalItems: number;
  blockedItems: number;
  outlineReadyItems: number;
  chapterCardItems: number;
  draftingItems: number;
  doneItems: number;
  estimatedRemainingWords: number;
  suggestedDailyWords: number;
  platformName: string;
  warnings: string[];
  nextActions: string[];
}

interface ChapterProductionSchedule {
  dashboard: ChapterProductionDashboard;
  items: ChapterProductionItem[];
}

function statusLabel(status: ChapterProductionItem["status"]) {
  const labels = {
    blocked: "待补",
    outline_ready: "可生成",
    card_ready: "章节卡",
    drafting: "写作中",
    done: "完成",
  };
  return labels[status];
}

function fieldLabel(field: string) {
  const labels: Record<string, string> = {
    summary: "摘要",
    goal: "目标",
    hook: "钩子",
    conflict: "冲突",
    valueShift: "转变",
    platformNote: "章末追读",
  };

  return labels[field] ?? field;
}

export function ChapterProductionPanel({ projectId }: { projectId: string }) {
  const [schedule, setSchedule] = useState<ChapterProductionSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [creatingNodeId, setCreatingNodeId] = useState<string | null>(null);
  const [repairingFixId, setRepairingFixId] = useState<string | null>(null);
  const [repairDrafts, setRepairDrafts] = useState<Record<string, Record<string, string>>>({});
  const [message, setMessage] = useState<string | null>(null);

  async function loadSchedule() {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/production-schedule`);
      if (!response.ok) {
        throw new Error("读取章节生产排期失败。");
      }
      const payload = (await response.json()) as { schedule: ChapterProductionSchedule };
      setSchedule(payload.schedule);
      setRepairDrafts(Object.fromEntries(
        payload.schedule.items
          .filter((item) => item.quickFix)
          .map((item) => [item.quickFix!.id, item.quickFix!.payload]),
      ));
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "读取章节生产排期失败。");
    } finally {
      setIsLoading(false);
    }
  }

  function updateRepairDraft(fixId: string, field: string, value: string) {
    setRepairDrafts((current) => ({
      ...current,
      [fixId]: {
        ...(current[fixId] ?? {}),
        [field]: value,
      },
    }));
  }

  async function applyQuickFix(fix: ChapterProductionQuickFix) {
    setRepairingFixId(fix.id);
    setMessage(null);
    try {
      const response = await fetch(fix.endpoint, {
        method: fix.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(repairDrafts[fix.id] ?? fix.payload),
      });
      if (!response.ok) {
        throw new Error("保存排期卡失败，请检查字段后重试。");
      }
      await loadSchedule();
      setMessage(`已保存：${fix.label}`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "保存排期卡失败。");
    } finally {
      setRepairingFixId(null);
    }
  }

  async function createChapterCard(outlineNodeId: string) {
    setCreatingNodeId(outlineNodeId);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/chapters/from-outline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outlineNodeId }),
      });
      if (!response.ok) {
        throw new Error("生成章节卡失败。");
      }
      const payload = (await response.json()) as { chapter: { title: string }; skipped?: boolean };
      await loadSchedule();
      setMessage(payload.skipped ? "章节卡已存在，已刷新排期。" : `已生成章节卡：${payload.chapter.title}`);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "生成章节卡失败。");
    } finally {
      setCreatingNodeId(null);
    }
  }

  useEffect(() => {
    void loadSchedule();
  }, [projectId]);

  const dashboard = schedule?.dashboard;

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-medium">章节生产排期</h2>
          <p className="mt-1 text-sm text-slate-600">把大纲、人物弧光、伏笔、剧情线和设定资料，压成可执行的章节生产队列。</p>
        </div>
        <button
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          disabled={isLoading}
          onClick={loadSchedule}
          type="button"
        >
          {isLoading ? "读取中" : "刷新排期"}
        </button>
      </div>

      {dashboard ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">排期卡</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.totalItems}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">待补</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.blockedItems}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">可生成</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.outlineReadyItems}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">章节卡</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.chapterCardItems}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">写作中</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.draftingItems}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">日更建议</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.suggestedDailyWords}</div>
          </div>
        </div>
      ) : null}

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}

      {dashboard ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-md border border-slate-200 p-3">
            <div className="font-medium text-slate-950">风险提醒</div>
            <div className="mt-3 grid gap-2 text-sm text-slate-600">
              {(dashboard.warnings.length ? dashboard.warnings : ["暂无明显排期风险。"]).map((warning) => (
                <div className="rounded-md bg-slate-50 p-2" key={warning}>{warning}</div>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-slate-200 p-3">
            <div className="font-medium text-slate-950">下一步动作</div>
            <div className="mt-3 grid gap-2 text-sm text-slate-600">
              {dashboard.nextActions.map((action, index) => (
                <div key={action}>{index + 1}. {action}</div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-3">
        {schedule?.items.map((item) => (
          <div className="rounded-md border border-slate-200 p-3 text-sm" key={item.id}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>第 {item.order} 位</span>
                  <span>{item.stage}</span>
                  <span>{statusLabel(item.status)}</span>
                </div>
                <div className="mt-1 font-medium text-slate-950">{item.title}</div>
                <p className="mt-2 text-slate-600">{item.action}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.chapterId ? (
                  <Link
                    className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white"
                    href={`/projects/${projectId}/chapters/${item.chapterId}`}
                  >
                    打开章节
                  </Link>
                ) : null}
                {!item.chapterId && item.outlineNodeId ? (
                  <button
                    className="rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                    disabled={creatingNodeId === item.outlineNodeId || item.status === "blocked"}
                    onClick={() => item.outlineNodeId ? createChapterCard(item.outlineNodeId) : undefined}
                    type="button"
                  >
                    {creatingNodeId === item.outlineNodeId ? "生成中" : "生成章节卡"}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-2">
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs font-medium text-slate-500">目标</div>
                <p className="mt-1 text-slate-700">{item.goal || "未填写"}</p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs font-medium text-slate-500">钩子</div>
                <p className="mt-1 text-slate-700">{item.hook || "未填写"}</p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs font-medium text-slate-500">冲突</div>
                <p className="mt-1 text-slate-700">{item.conflict || "未填写"}</p>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <div className="text-xs font-medium text-slate-500">章末追读</div>
                <p className="mt-1 text-slate-700">{item.cliffhanger || "未填写"}</p>
              </div>
            </div>

            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              <div className="rounded-md border border-slate-200 p-3">
                <div className="text-xs font-medium text-slate-500">人物推动</div>
                <p className="mt-1 text-slate-700">{item.primaryCharacter}</p>
              </div>
              <div className="rounded-md border border-slate-200 p-3">
                <div className="text-xs font-medium text-slate-500">设定锚点</div>
                <p className="mt-1 text-slate-700">{item.worldAnchors.length ? item.worldAnchors.join("、") : "未绑定设定"}</p>
              </div>
              <div className="rounded-md border border-slate-200 p-3">
                <div className="text-xs font-medium text-slate-500">伏笔/剧情线</div>
                <p className="mt-1 text-slate-700">{item.lineBeats.length ? item.lineBeats.join("；") : "暂无绑定"}</p>
              </div>
            </div>

            {item.missingFields.length ? (
              <p className="mt-3 text-sm text-slate-600">缺口：{item.missingFields.join("、")}</p>
            ) : null}

            {item.quickFix ? (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-medium text-slate-950">{item.quickFix.label}</div>
                    <p className="mt-1 text-sm text-slate-600">{item.quickFix.description}</p>
                  </div>
                  <button
                    className="w-fit rounded-md bg-slate-950 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                    disabled={repairingFixId === item.quickFix.id}
                    onClick={() => item.quickFix ? void applyQuickFix(item.quickFix) : undefined}
                    type="button"
                  >
                    {repairingFixId === item.quickFix.id ? "保存中" : "保存排期卡"}
                  </button>
                </div>
                <div className="mt-3 grid gap-2 lg:grid-cols-2">
                  {Object.entries(repairDrafts[item.quickFix.id] ?? item.quickFix.payload).map(([field, value]) => (
                    <label className="grid gap-1" key={`${item.quickFix?.id}:${field}`}>
                      <span className="text-xs font-medium text-slate-600">{fieldLabel(field)}</span>
                      <textarea
                        className="min-h-20 resize-y rounded-md border border-amber-200 bg-white px-3 py-2 text-sm leading-6 outline-none focus:border-amber-400"
                        onChange={(event) => item.quickFix ? updateRepairDraft(item.quickFix.id, field, event.target.value) : undefined}
                        value={value}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ))}
        {schedule && schedule.items.length === 0 ? (
          <p className="rounded-md border border-slate-200 p-3 text-sm text-slate-600">还没有可生产节点，先去大纲树补开头、主干、分支、叶片和结尾。</p>
        ) : null}
      </div>
    </section>
  );
}
