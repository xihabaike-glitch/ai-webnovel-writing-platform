import Link from "next/link";
import { AppShell } from "@/components/app-shell/AppShell";
import { ProjectForm } from "@/components/projects/ProjectForm";

const demoProjects = [
  {
    id: "demo",
    title: "示例作品：夜雨系统",
    targetPlatform: "fanqie",
    currentWordCount: 0,
    targetWordCount: 300000,
  },
];

export default function ProjectsPage() {
  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">作品</h1>
          <p className="mt-1 text-sm text-slate-600">MVP 阶段先建立作品工作台骨架。</p>
        </div>
      </div>
      <div className="mb-6">
        <ProjectForm />
      </div>
      <div className="grid gap-3">
        {demoProjects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="rounded-md border border-slate-200 bg-white p-4 hover:bg-slate-50"
          >
            <div className="font-medium">{project.title}</div>
            <div className="mt-1 text-sm text-slate-600">
              {project.targetPlatform} · {project.currentWordCount}/{project.targetWordCount} 字
            </div>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
