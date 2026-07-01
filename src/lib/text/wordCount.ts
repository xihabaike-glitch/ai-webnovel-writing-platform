export function countWords(input: string): number {
  const chineseChars = input.match(/[\u4e00-\u9fff]/g) ?? [];
  const withoutChinese = input.replace(/[\u4e00-\u9fff]/g, " ");
  const englishWords = withoutChinese.match(/[A-Za-z0-9]+(?:['-][A-Za-z0-9]+)*/g) ?? [];
  return chineseChars.length + englishWords.length;
}

