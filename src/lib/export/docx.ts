import { exportMarkdownFileSuffix, exportProjectMarkdownByMode, type ExportMarkdownMode, type ExportProject } from "./markdown.ts";

const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function stripMarkdownEmphasis(value: string) {
  return value.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").trim();
}

function paragraph(text: string, style?: "Title" | "Heading1" | "Heading2" | "Heading3") {
  const styleXml = style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : "";
  return `<w:p>${styleXml}<w:r><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

function markdownLineToParagraph(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("# ")) return paragraph(trimmed.slice(2).trim(), "Title");
  if (trimmed.startsWith("## ")) return paragraph(trimmed.slice(3).trim(), "Heading1");
  if (trimmed.startsWith("### ")) return paragraph(trimmed.slice(4).trim(), "Heading2");
  if (trimmed.startsWith("#### ")) return paragraph(trimmed.slice(5).trim(), "Heading3");
  if (trimmed.startsWith("- ")) return paragraph(`• ${stripMarkdownEmphasis(trimmed.slice(2))}`);
  if (trimmed.startsWith("* ")) return paragraph(`• ${stripMarkdownEmphasis(trimmed.slice(2))}`);
  return paragraph(stripMarkdownEmphasis(trimmed));
}

function buildDocumentXml(markdown: string) {
  const body = markdown
    .split(/\r?\n/)
    .map(markdownLineToParagraph)
    .filter(Boolean)
    .join("");

  return `${XML_DECLARATION}<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`;
}

function contentTypesXml() {
  return `${XML_DECLARATION}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`;
}

function relationshipsXml() {
  return `${XML_DECLARATION}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`;
}

function stylesXml() {
  return `${XML_DECLARATION}<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Arial" w:eastAsia="Microsoft YaHei" w:hAnsi="Arial"/><w:sz w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:rFonts w:ascii="Arial" w:eastAsia="Microsoft YaHei" w:hAnsi="Arial"/><w:sz w:val="36"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:rFonts w:ascii="Arial" w:eastAsia="Microsoft YaHei" w:hAnsi="Arial"/><w:sz w:val="30"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:rFonts w:ascii="Arial" w:eastAsia="Microsoft YaHei" w:hAnsi="Arial"/><w:sz w:val="26"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:rFonts w:ascii="Arial" w:eastAsia="Microsoft YaHei" w:hAnsi="Arial"/><w:sz w:val="24"/></w:rPr></w:style></w:styles>`;
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUInt16(value: number) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value, 0);
  return buffer;
}

function writeUInt32(value: number) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value >>> 0, 0);
  return buffer;
}

function zipDateTime(date = new Date("2026-01-01T00:00:00Z")) {
  const dosTime = (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | Math.floor(date.getUTCSeconds() / 2);
  const dosDate = ((date.getUTCFullYear() - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate();
  return { dosDate, dosTime };
}

function createZip(files: Array<{ path: string; content: string }>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  const { dosDate, dosTime } = zipDateTime();
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.path, "utf8");
    const content = Buffer.from(file.content, "utf8");
    const crc = crc32(content);

    const localHeader = Buffer.concat([
      writeUInt32(0x04034b50),
      writeUInt16(20),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(dosTime),
      writeUInt16(dosDate),
      writeUInt32(crc),
      writeUInt32(content.length),
      writeUInt32(content.length),
      writeUInt16(name.length),
      writeUInt16(0),
      name,
    ]);
    localParts.push(localHeader, content);

    centralParts.push(Buffer.concat([
      writeUInt32(0x02014b50),
      writeUInt16(20),
      writeUInt16(20),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(dosTime),
      writeUInt16(dosDate),
      writeUInt32(crc),
      writeUInt32(content.length),
      writeUInt32(content.length),
      writeUInt16(name.length),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt16(0),
      writeUInt32(0),
      writeUInt32(offset),
      name,
    ]));

    offset += localHeader.length + content.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.concat([
    writeUInt32(0x06054b50),
    writeUInt16(0),
    writeUInt16(0),
    writeUInt16(files.length),
    writeUInt16(files.length),
    writeUInt32(centralDirectory.length),
    writeUInt32(offset),
    writeUInt16(0),
  ]);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

export function exportProjectDocxByMode(project: ExportProject, mode: ExportMarkdownMode = "full") {
  const markdown = exportProjectMarkdownByMode(project, mode);
  return createZip([
    { path: "[Content_Types].xml", content: contentTypesXml() },
    { path: "_rels/.rels", content: relationshipsXml() },
    { path: "word/document.xml", content: buildDocumentXml(markdown) },
    { path: "word/styles.xml", content: stylesXml() },
  ]);
}

export function exportDocxFileSuffix(mode: ExportMarkdownMode = "full") {
  return exportMarkdownFileSuffix(mode);
}

export function docxContentType() {
  return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}
