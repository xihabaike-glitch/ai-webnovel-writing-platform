"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { platformProfiles, type LengthType, type PlatformId } from "@/lib/platforms/platformProfiles";
import { getPlatformWritingStyle } from "@/lib/platforms/writingStyleTemplates";
import { projectTemplates } from "@/lib/projects/projectTemplates";

const lengthOptions = [
  { id: "short_10k", label: "1 万字短篇" },
  { id: "mid_50k", label: "5-6 万字中篇" },
  { id: "long_300k_plus", label: "30 万字以上长篇" },
  { id: "mega_1m_plus", label: "100 万字以上超长篇" },
];

export function ProjectForm() {
  const router = useRouter();
  const defaultTemplate = projectTemplates[0];
  const [templateId, setTemplateId] = useState(defaultTemplate.id);
  const [title, setTitle] = useState(defaultTemplate.titleSeed);
  const [genre, setGenre] = useState(defaultTemplate.genre);
  const [updateCadence, setUpdateCadence] = useState(defaultTemplate.updateCadence);
  const [platformId, setPlatformId] = useState<PlatformId>(defaultTemplate.platformId);
  const [lengthType, setLengthType] = useState<LengthType>(defaultTemplate.lengthType);
  const [sellingPoint, setSellingPoint] = useState(defaultTemplate.sellingPoint);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selectedProfile = platformProfiles.find((profile) => profile.id === platformId) ?? platformProfiles[0];
  const selectedTemplate = projectTemplates.find((template) => template.id === templateId) ?? defaultTemplate;
  const selectedStyle = getPlatformWritingStyle(selectedProfile.id);

  function applyTemplate(nextTemplateId: string) {
    const template = projectTemplates.find((item) => item.id === nextTemplateId) ?? defaultTemplate;
    setTemplateId(template.id);
    setTitle(template.titleSeed);
    setGenre(template.genre);
    setUpdateCadence(template.updateCadence);
    setPlatformId(template.platformId);
    setLengthType(template.lengthType);
    setSellingPoint(template.sellingPoint);
  }

  function applyPlatform(nextPlatformId: PlatformId) {
    const template = projectTemplates.find((item) => item.platformId === nextPlatformId) ?? defaultTemplate;
    applyTemplate(template.id);
  }

  async function createProject(formData: FormData) {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: String(formData.get("title") ?? ""),
          targetPlatform: String(formData.get("platform") ?? "fanqie"),
          targetLengthType: String(formData.get("length") ?? selectedProfile.defaultLengthType),
          genre: String(formData.get("genre") ?? ""),
          sellingPoint: String(formData.get("sellingPoint") ?? ""),
          updateCadence: String(formData.get("updateCadence") ?? ""),
          templateId: String(formData.get("templateId") ?? ""),
        }),
      });

      if (!response.ok) {
        throw new Error("创建作品失败，请检查必填字段。");
      }

      const payload = (await response.json()) as { project: { id: string } };
      router.push(`/projects/${payload.project.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "创建作品失败。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form action={createProject} className="grid gap-4 rounded-md border border-slate-200 bg-white p-4">
      <div>
        <label className="text-sm font-medium" htmlFor="templateId">
          开书模板
        </label>
        <select
          className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
          id="templateId"
          name="templateId"
          onChange={(event) => applyTemplate(event.target.value)}
          value={templateId}
        >
          {projectTemplates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.label}
            </option>
          ))}
        </select>
        <div className="mt-2 rounded-md bg-slate-50 p-3 text-sm text-slate-600">
          <div className="font-medium text-slate-900">{selectedTemplate.label}</div>
          <div className="mt-1">{selectedTemplate.positioning}</div>
          <div className="mt-1">前三章：{selectedTemplate.firstThree.map((chapter) => chapter.title).join(" / ")}</div>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="title">
          作品名
        </label>
        <input
          className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
          id="title"
          name="title"
          onChange={(event) => setTitle(event.target.value)}
          value={title}
        />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium" htmlFor="genre">
            题材
          </label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
            id="genre"
            name="genre"
            onChange={(event) => setGenre(event.target.value)}
            value={genre}
          />
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="updateCadence">
            更新节奏
          </label>
          <input
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
            id="updateCadence"
            name="updateCadence"
            onChange={(event) => setUpdateCadence(event.target.value)}
            value={updateCadence}
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium" htmlFor="platform">
            目标平台
          </label>
          <select
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
            id="platform"
            name="platform"
            onChange={(event) => applyPlatform(event.target.value as PlatformId)}
            value={platformId}
          >
            {platformProfiles.map((platform) => (
              <option key={platform.id} value={platform.id}>
                {platform.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm font-medium" htmlFor="length">
            篇幅
          </label>
          <select
            className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
            id="length"
            name="length"
            onChange={(event) => setLengthType(event.target.value as LengthType)}
            value={lengthType}
          >
            {lengthOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-600">
        <div className="font-medium text-slate-900">{selectedProfile.name} 写作提醒</div>
        <div className="mt-1">开头：{selectedProfile.openingRules.join("；")}</div>
        <div className="mt-1">审稿：{selectedProfile.reviewFocus.join("、")}</div>
      </div>
      <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-3 text-sm text-slate-600 md:grid-cols-2">
        <div>
          <div className="font-medium text-slate-900">平台风格模板</div>
          <div className="mt-1">读者承诺：{selectedStyle.audiencePromise}</div>
          <div className="mt-1">首屏钩子：{selectedStyle.openingHook}</div>
          <div className="mt-1">章节节奏：{selectedStyle.chapterRhythm}</div>
        </div>
        <div>
          <div className="font-medium text-slate-900">生成时会强制检查</div>
          <div className="mt-1">章末：{selectedStyle.endingBeat}</div>
          <div className="mt-1">语言：{selectedStyle.languageStyle}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedStyle.mustHave.map((item) => (
              <span className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700" key={item}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div>
        <label className="text-sm font-medium" htmlFor="sellingPoint">
          核心卖点
        </label>
        <textarea
          className="mt-1 min-h-20 w-full rounded-md border border-slate-200 px-3 py-2"
          id="sellingPoint"
          name="sellingPoint"
          onChange={(event) => setSellingPoint(event.target.value)}
          value={sellingPoint}
        />
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button
        className="w-fit rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "创建中" : "创建作品"}
      </button>
    </form>
  );
}
