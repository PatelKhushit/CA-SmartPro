import { describe, expect, it } from 'vitest';
import { isAllowedUpload } from './upload-validation.js';

describe('isAllowedUpload', () => {
  it('accepts a matching mime type and extension', () => {
    expect(isAllowedUpload('application/pdf', 'invoice.pdf')).toBe(true);
    expect(isAllowedUpload('image/jpeg', 'photo.JPG')).toBe(true);
  });

  it('rejects an unrecognized mime type', () => {
    expect(isAllowedUpload('application/x-msdownload', 'virus.exe')).toBe(false);
  });

  it('rejects a mime/extension mismatch (spoofed content type)', () => {
    expect(isAllowedUpload('application/pdf', 'script.exe')).toBe(false);
    expect(isAllowedUpload('image/png', 'file.pdf')).toBe(false);
  });

  it('rejects a filename with no extension', () => {
    expect(isAllowedUpload('application/pdf', 'noextension')).toBe(false);
  });
});
