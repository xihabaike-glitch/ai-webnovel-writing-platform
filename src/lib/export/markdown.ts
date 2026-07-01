interface ExportChapter {
  order: number;
  title: string;
  content: string;
}

interface ExportProject {
  title: string;
  chapters: ExportChapter[];
}

export function exportProjectMarkdown(project: ExportProject): string {
  const chapters = [...project.chapters].sort((a, b) => a.order - b.order);
  return [
    `# ${project.title}`,
    "",
    ...chapters.flatMap((chapter) => [`## ${chapter.title}`, "", chapter.content.trim(), ""]),
  ].join("\n");
}

