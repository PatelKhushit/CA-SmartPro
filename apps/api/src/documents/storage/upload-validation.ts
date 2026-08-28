/**
 * Upload allowlist: MIME type must be recognized AND the filename's
 * extension must match that MIME type's known extensions. Rejects anything
 * else — no executables, scripts, or unrecognized types. Not a substitute
 * for malware scanning (Phase 2: requires a scanning provider); this only
 * constrains file *type*.
 */
export const ALLOWED_MIME_EXTENSIONS: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/csv': ['.csv'],
};

export function isAllowedUpload(mimeType: string, originalFilename: string): boolean {
  const allowedExtensions = ALLOWED_MIME_EXTENSIONS[mimeType];
  if (!allowedExtensions) return false;
  const dotIndex = originalFilename.lastIndexOf('.');
  if (dotIndex === -1) return false;
  const ext = originalFilename.slice(dotIndex).toLowerCase();
  return allowedExtensions.includes(ext);
}
