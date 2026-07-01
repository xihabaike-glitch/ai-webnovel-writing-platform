"use client";

import { useState } from "react";
import { platformProfiles, type PlatformId } from "@/lib/platforms/platformProfiles";

const lengthOptions = [
  { id: "short_10k", label: "1 万字短篇" },
  { id: "mid_50k", label: "5-6 万字中篇" },
  { id: "long_300k_plus", label: "30 万字以上长篇" },
  { id: "mega_1m_plus", label: "100 万字以上超长篇" },
];

export function ProjectForm() {
  const [platformId, setPlatformId] = useState<PlatformId>("fanqie");
  const selectedProfile = platformProfiles.find((profile) => profile.id === platformId) ?? platformProfiles[0];

  return (
    <form className="grid gap-4 rounded-md border border-slate-200 bg-white p-4">
      <div>
        <label className="text-sm font-medium" htmlFor="title">
          作品名
        </label>
        <input
          className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
          defaultValue="夜雨系统"
          id="title"
          name="title"
        />
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
            onChange={(event) => setPlatformId(event.target.value as PlatformId)}
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
          <select className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2" id="length" name="length">
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
    </form>
  );
}

