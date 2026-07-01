import Link from "next/link";
import { AppShell } from "@/components/app-shell/AppShell";

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return (
    <AppShell>
      <div className="grid gap-6">
        <div>
          <h1 className="text-2xl font-semibold">作品工作台</h1>
          <p className="mt-1 text-sm text-slate-600">项目 ID：{projectId}</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Link className="rounded-md border bg-white p-4" href={`/projects/${projectId}/chapters/demo`}>
            <div className="font-medium">章节编辑</div>
            <p className="mt-2 text-sm text-slate-600">进入正文、章节卡和 AI 审稿面板。</p>
          </Link>
          <div className="rounded-md border bg-white p-4">
            <div className="font-medium">大纲树</div>
            <p className="mt-2 text-sm text-slate-600">根、主干、支线、叶片的作品结构。</p>
          </div>
          <div className="rounded-md border bg-white p-4">
            <div className="font-medium">平台策略</div>
            <p className="mt-2 text-sm text-slate-600">起点、番茄、七猫、知乎盐选和海外平台画像。</p>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
