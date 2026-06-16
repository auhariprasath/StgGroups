import { supabase } from "./supabase";

function client() {
  if (!supabase) throw new Error("Supabase client not initialised");
  return supabase;
}

export async function uploadFile(
  bucket: string,
  path: string,
  file: File
): Promise<{ url: string }> {
  const { error } = await client().storage.from(bucket).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw new Error(error.message);
  return { url: getPublicUrl(bucket, path) };
}

export function getPublicUrl(bucket: string, path: string): string {
  const { data } = client().storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ── File validation (Phase 14) ───────────────────────────────────────────────

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_PDF_TYPES = ["application/pdf"];

export const FILE_TYPES = {
  image: ALLOWED_IMAGE_TYPES,
  pdf: ALLOWED_PDF_TYPES,
  proof: [...ALLOWED_IMAGE_TYPES, ...ALLOWED_PDF_TYPES],
};

export function validateFile(
  file: File,
  options: { maxSizeMb?: number; allowedTypes?: string[] } = {},
): { valid: boolean; error?: string } {
  const maxBytes = (options.maxSizeMb ?? 5) * 1024 * 1024;
  if (file.size > maxBytes) {
    return { valid: false, error: `File too large — max ${options.maxSizeMb ?? 5} MB allowed.` };
  }
  if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
    const exts = options.allowedTypes.map((t) => t.split("/")[1]).join(", ");
    return { valid: false, error: `File type not allowed. Accepted: ${exts}` };
  }
  return { valid: true };
}
