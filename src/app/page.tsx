import Link from "next/link";
import { AppShell } from "@/components/app-shell/AppShell";

export default function HomePage() {
  return (
    <AppShell>
      <section className="grid gap-6">
        <div>
          <h1 className="text-3xl font-semibold">写作品，不是陪聊天框闲聊</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            从平台、篇幅、大纲、章节、人物、伏笔到 AI 审稿，先把作品工程立住。
          </p>
        </div>
        <Link
          className="inline-flex w-fit rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white"
          href="/projects"
        >
          进入作品工作台
        </Link>
      </section>
    </AppShell>
  );
}

