// src/services/storage.service.ts
import type { UploadedFile } from "express-fileupload";

export async function saveUploadedFile(file: UploadedFile): Promise<string> {
  const buffer = file.data; // Buffer
  const mimetype = file.mimetype; // string
  const filename = file.name; // string

  // TODO: buffer를 스토리지에 저장하고 공개 URL 반환
  // 예시:
  // const url = await putToS3({ buffer, mimetype, key: filename });

  const url = `https://example.invalid/uploads/${Date.now()}-${filename}`;
  return url;
}
