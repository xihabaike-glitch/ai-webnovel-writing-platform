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

export function createStoredZip(files: Array<{ path: string; content: string | Buffer }>) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  const { dosDate, dosTime } = zipDateTime();
  let offset = 0;

  for (const file of files) {
    const name = Buffer.from(file.path, "utf8");
    const content = Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content, "utf8");
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
