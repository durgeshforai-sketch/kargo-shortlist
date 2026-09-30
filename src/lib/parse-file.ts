import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

export async function fileToText(fileName: string, bytes: Uint8Array): Promise<string> {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) {
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    return text;
  }
  if (lower.endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
    return value;
  }
  if (lower.endsWith(".txt")) return new TextDecoder().decode(bytes);
  throw new Error("Unsupported file type: upload PDF, DOCX or TXT");
}
