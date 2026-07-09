export class InvalidStoryLineReferencesError extends Error {
  constructor() {
    super("Invalid story-line references for this project.");
    this.name = "InvalidStoryLineReferencesError";
  }
}

export function validateStoryLineReferences(input: {
  chapterIds: Array<string | null | undefined>;
  characterIds: string[];
  existingChapterIds: string[];
  existingCharacterIds: string[];
}) {
  const chapterIds = input.chapterIds.filter((id): id is string => Boolean(id));
  const requestedChapterIds = new Set(chapterIds);
  const requestedCharacterIds = new Set(input.characterIds);
  const existingChapterIds = new Set(input.existingChapterIds);
  const existingCharacterIds = new Set(input.existingCharacterIds);

  const hasMissingChapter = [...requestedChapterIds].some((id) => !existingChapterIds.has(id));
  const hasMissingCharacter = [...requestedCharacterIds].some((id) => !existingCharacterIds.has(id));
  if (hasMissingChapter || hasMissingCharacter) {
    throw new InvalidStoryLineReferencesError();
  }
}
