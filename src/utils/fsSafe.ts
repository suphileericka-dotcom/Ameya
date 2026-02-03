import fs from "fs";

export function safeUnlink(filePath: string) {
  try {
    fs.unlinkSync(filePath);
  } catch {
    // ignore
  }
}
