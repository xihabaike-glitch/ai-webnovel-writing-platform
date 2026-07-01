"use client";

import { useEffect, useMemo, useState } from "react";

interface CharacterCard {
  id: string;
  name: string;
  role: string;
  desire: string;
  need: string;
  flaw: string;
  arcStart: string;
  arcEnd: string;
  voice: string;
  relationshipNotes: string;
}

interface CharacterArcSummary {
  id: string;
  name: string;
  role: string;
  completeness: number;
  status: "complete" | "partial" | "empty";
  missingFields: string[];
  pressureNote: string;
}

interface CharacterArcDashboard {
  totalCharacters: number;
  completeCharacters: number;
  averageCompleteness: number;
  summaries: CharacterArcSummary[];
  relationshipWarnings: string[];
  nextActions: string[];
}

const emptyCharacter = {
  name: "林晚",
  role: "主角",
  desire: "活下去并查清系统来源",
  need: "学会主动选择，而不是被规则推着走",
  flaw: "遇到压力时先逃避",
  arcStart: "被系统和危机推着走",
  arcEnd: "主动定义自己的规则",
  voice: "克制、敏锐，越危险越冷静",
  relationshipNotes: "和反派存在系统标记牵连，和盟友之间有信任代价",
};

function statusLabel(status: CharacterArcSummary["status"]) {
  if (status === "complete") return "完整";
  if (status === "partial") return "待补";
  return "空壳";
}

export function CharacterArcPanel({ projectId }: { projectId: string }) {
  const [characters, setCharacters] = useState<CharacterCard[]>([]);
  const [dashboard, setDashboard] = useState<CharacterArcDashboard | null>(null);
  const [draft, setDraft] = useState(emptyCharacter);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<CharacterCard | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const selectedSummary = useMemo(
    () => dashboard?.summaries.find((summary) => summary.id === editingId) ?? null,
    [dashboard, editingId],
  );

  async function loadCharacters() {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/characters`);
      if (!response.ok) {
        throw new Error("读取人物卡失败。");
      }
      const payload = (await response.json()) as {
        characters: CharacterCard[];
        dashboard: CharacterArcDashboard;
      };
      setCharacters(payload.characters);
      setDashboard(payload.dashboard);
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "读取人物卡失败。");
    } finally {
      setIsLoading(false);
    }
  }

  async function createCharacter() {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/characters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      if (!response.ok) {
        throw new Error("创建人物卡失败。");
      }
      const payload = (await response.json()) as {
        character: CharacterCard;
        dashboard: CharacterArcDashboard;
      };
      setCharacters((current) => [...current, payload.character]);
      setDashboard(payload.dashboard);
      setDraft({ ...emptyCharacter, name: "", role: "" });
      setMessage("已创建人物卡");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "创建人物卡失败。");
    } finally {
      setIsSaving(false);
    }
  }

  async function updateCharacter() {
    if (!editingDraft) return;
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/characters/${editingDraft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingDraft),
      });
      if (!response.ok) {
        throw new Error("保存人物卡失败。");
      }
      const payload = (await response.json()) as {
        character: CharacterCard;
        dashboard: CharacterArcDashboard;
      };
      setCharacters((current) => current.map((character) => (
        character.id === payload.character.id ? payload.character : character
      )));
      setDashboard(payload.dashboard);
      setEditingId(null);
      setEditingDraft(null);
      setMessage("已保存人物弧光");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "保存人物卡失败。");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteCharacter(characterId: string) {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/characters/${characterId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("删除人物卡失败。");
      }
      const payload = (await response.json()) as { dashboard: CharacterArcDashboard };
      setCharacters((current) => current.filter((character) => character.id !== characterId));
      setDashboard(payload.dashboard);
      if (editingId === characterId) {
        setEditingId(null);
        setEditingDraft(null);
      }
      setMessage("已删除人物卡");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : "删除人物卡失败。");
    } finally {
      setIsSaving(false);
    }
  }

  function startEditing(character: CharacterCard) {
    setEditingId(character.id);
    setEditingDraft(character);
  }

  useEffect(() => {
    void loadCharacters();
  }, [projectId]);

  return (
    <section className="rounded-md border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="font-medium">人物弧光与关系网</h2>
          <p className="mt-1 text-sm text-slate-600">补主角欲望、真正需求、缺陷、转变和关系压力。</p>
        </div>
        <button
          className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          disabled={isLoading}
          onClick={loadCharacters}
          type="button"
        >
          {isLoading ? "读取中" : "刷新人物"}
        </button>
      </div>

      {dashboard ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">人物</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.totalCharacters}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">完整弧光</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.completeCharacters}</div>
          </div>
          <div className="rounded-md bg-slate-50 p-3">
            <div className="text-xs text-slate-500">平均完整度</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{dashboard.averageCompleteness}%</div>
          </div>
        </div>
      ) : null}

      {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-md border border-slate-200 p-3">
          <div className="font-medium text-slate-950">新人物卡</div>
          <div className="mt-3 grid gap-2 text-sm text-slate-600">
            <input className="rounded-md border border-slate-200 px-3 py-2" onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="姓名" value={draft.name} />
            <input className="rounded-md border border-slate-200 px-3 py-2" onChange={(event) => setDraft({ ...draft, role: event.target.value })} placeholder="定位" value={draft.role} />
            <input className="rounded-md border border-slate-200 px-3 py-2" onChange={(event) => setDraft({ ...draft, desire: event.target.value })} placeholder="欲望" value={draft.desire} />
            <input className="rounded-md border border-slate-200 px-3 py-2" onChange={(event) => setDraft({ ...draft, need: event.target.value })} placeholder="真正需求" value={draft.need} />
            <input className="rounded-md border border-slate-200 px-3 py-2" onChange={(event) => setDraft({ ...draft, flaw: event.target.value })} placeholder="缺陷" value={draft.flaw} />
            <div className="grid gap-2 sm:grid-cols-2">
              <input className="rounded-md border border-slate-200 px-3 py-2" onChange={(event) => setDraft({ ...draft, arcStart: event.target.value })} placeholder="弧光起点" value={draft.arcStart} />
              <input className="rounded-md border border-slate-200 px-3 py-2" onChange={(event) => setDraft({ ...draft, arcEnd: event.target.value })} placeholder="弧光终点" value={draft.arcEnd} />
            </div>
            <input className="rounded-md border border-slate-200 px-3 py-2" onChange={(event) => setDraft({ ...draft, voice: event.target.value })} placeholder="人物声音" value={draft.voice} />
            <textarea className="min-h-20 rounded-md border border-slate-200 px-3 py-2" onChange={(event) => setDraft({ ...draft, relationshipNotes: event.target.value })} placeholder="关系压力" value={draft.relationshipNotes} />
            <button
              className="w-fit rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              disabled={isSaving || !draft.name.trim() || !draft.role.trim()}
              onClick={createCharacter}
              type="button"
            >
              {isSaving ? "保存中" : "创建人物"}
            </button>
          </div>
        </div>

        <div className="grid gap-3">
          {characters.map((character) => {
            const summary = dashboard?.summaries.find((item) => item.id === character.id);
            return (
              <div className="rounded-md border border-slate-200 p-3 text-sm" key={character.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="font-medium text-slate-950">{character.name} · {character.role}</div>
                    <div className="mt-1 text-slate-500">
                      完整度 {summary?.completeness ?? 0}% · {summary ? statusLabel(summary.status) : "待补"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="rounded-md border border-slate-200 px-3 py-1.5 hover:bg-slate-50" onClick={() => startEditing(character)} type="button">
                      编辑
                    </button>
                    <button className="rounded-md border border-slate-200 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50" disabled={isSaving} onClick={() => deleteCharacter(character.id)} type="button">
                      删除
                    </button>
                  </div>
                </div>
                <div className="mt-2 grid gap-1 text-slate-600">
                  <div>欲望：{character.desire || "未填写"}</div>
                  <div>缺陷：{character.flaw || "未填写"}</div>
                  <div>转变：{character.arcStart || "未填写"} → {character.arcEnd || "未填写"}</div>
                  <div>关系压力：{summary?.pressureNote ?? (character.relationshipNotes || "未填写")}</div>
                </div>
                {summary && summary.missingFields.length > 0 ? (
                  <div className="mt-2 text-slate-500">待补：{summary.missingFields.join("、")}</div>
                ) : null}
              </div>
            );
          })}
          {characters.length === 0 ? <p className="text-sm text-slate-600">还没有人物卡。先创建主角，再补反派和关系镜像。</p> : null}
        </div>
      </div>

      {editingDraft ? (
        <div className="mt-4 rounded-md bg-slate-50 p-3 text-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="font-medium text-slate-950">编辑：{editingDraft.name}</div>
            {selectedSummary ? <div className="text-xs text-slate-500">完整度 {selectedSummary.completeness}%</div> : null}
          </div>
          <div className="mt-3 grid gap-2 text-slate-600 lg:grid-cols-2">
            <input className="rounded-md border border-slate-200 px-3 py-2" onChange={(event) => setEditingDraft({ ...editingDraft, name: event.target.value })} value={editingDraft.name} />
            <input className="rounded-md border border-slate-200 px-3 py-2" onChange={(event) => setEditingDraft({ ...editingDraft, role: event.target.value })} value={editingDraft.role} />
            <input className="rounded-md border border-slate-200 px-3 py-2" onChange={(event) => setEditingDraft({ ...editingDraft, desire: event.target.value })} value={editingDraft.desire} />
            <input className="rounded-md border border-slate-200 px-3 py-2" onChange={(event) => setEditingDraft({ ...editingDraft, need: event.target.value })} value={editingDraft.need} />
            <input className="rounded-md border border-slate-200 px-3 py-2" onChange={(event) => setEditingDraft({ ...editingDraft, flaw: event.target.value })} value={editingDraft.flaw} />
            <input className="rounded-md border border-slate-200 px-3 py-2" onChange={(event) => setEditingDraft({ ...editingDraft, voice: event.target.value })} value={editingDraft.voice} />
            <input className="rounded-md border border-slate-200 px-3 py-2" onChange={(event) => setEditingDraft({ ...editingDraft, arcStart: event.target.value })} value={editingDraft.arcStart} />
            <input className="rounded-md border border-slate-200 px-3 py-2" onChange={(event) => setEditingDraft({ ...editingDraft, arcEnd: event.target.value })} value={editingDraft.arcEnd} />
          </div>
          <textarea className="mt-2 min-h-20 w-full rounded-md border border-slate-200 px-3 py-2 text-slate-600" onChange={(event) => setEditingDraft({ ...editingDraft, relationshipNotes: event.target.value })} value={editingDraft.relationshipNotes} />
          <div className="mt-3 flex gap-2">
            <button className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={isSaving || !editingDraft.name.trim() || !editingDraft.role.trim()} onClick={updateCharacter} type="button">
              保存弧光
            </button>
            <button className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium hover:bg-white" onClick={() => { setEditingId(null); setEditingDraft(null); }} type="button">
              取消
            </button>
          </div>
        </div>
      ) : null}

      {dashboard ? (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-md bg-slate-50 p-3 text-sm">
            <div className="font-medium text-slate-950">关系网风险</div>
            <div className="mt-2 grid gap-2 text-slate-600">
              {dashboard.relationshipWarnings.length > 0
                ? dashboard.relationshipWarnings.map((warning) => <div key={warning}>{warning}</div>)
                : <div>人物关系压力基本可用。</div>}
            </div>
          </div>
          <div className="rounded-md bg-slate-50 p-3 text-sm">
            <div className="font-medium text-slate-950">下一步</div>
            <div className="mt-2 grid gap-2 text-slate-600">
              {dashboard.nextActions.map((action) => <div key={action}>{action}</div>)}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
