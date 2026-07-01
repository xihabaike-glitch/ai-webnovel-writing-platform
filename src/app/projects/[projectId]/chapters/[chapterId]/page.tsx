import { ChapterReviewPanel } from "@/components/ai/ChapterReviewPanel";
import { AppShell } from "@/components/app-shell/AppShell";
import { ChapterEditor } from "@/components/chapters/ChapterEditor";

export default async function ChapterPage({
  params,
}: {
  params: Promise<{ projectId: string; chapterId: string }>;
}) {
  const { chapterId } = await params;
  return (
    <AppShell>
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <ChapterEditor />
        <ChapterReviewPanel chapterId={chapterId} />
      </div>
    </AppShell>
  );
}
