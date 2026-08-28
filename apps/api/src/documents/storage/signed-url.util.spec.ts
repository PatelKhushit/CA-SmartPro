import { describe, expect, it } from 'vitest';
import { createSignedDownloadToken, verifySignedDownloadToken } from './signed-url.util.js';

const SECRET = 'test-signing-secret';
const PAYLOAD = { documentId: 'doc_1', versionId: 'ver_1', organizationId: 'org_1' };

describe('signed-url.util', () => {
  it('round-trips a token signed and verified with the same secret', () => {
    const exp = Math.floor(Date.now() / 1000) + 300;
    const token = createSignedDownloadToken({ ...PAYLOAD, exp }, SECRET);
    const result = verifySignedDownloadToken(token, SECRET);
    expect(result).toEqual({ ...PAYLOAD, exp });
  });

  it('rejects a token verified with the wrong secret', () => {
    const exp = Math.floor(Date.now() / 1000) + 300;
    const token = createSignedDownloadToken({ ...PAYLOAD, exp }, SECRET);
    expect(verifySignedDownloadToken(token, 'a-different-secret')).toBeNull();
  });

  it('rejects an expired token', () => {
    const exp = Math.floor(Date.now() / 1000) - 10;
    const token = createSignedDownloadToken({ ...PAYLOAD, exp }, SECRET);
    expect(verifySignedDownloadToken(token, SECRET)).toBeNull();
  });

  it('rejects a tampered payload', () => {
    const exp = Math.floor(Date.now() / 1000) + 300;
    const token = createSignedDownloadToken({ ...PAYLOAD, exp }, SECRET);
    const [, signature] = token.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ ...PAYLOAD, exp, documentId: 'doc_evil' })).toString(
      'base64url',
    );
    expect(verifySignedDownloadToken(`${tamperedPayload}.${signature}`, SECRET)).toBeNull();
  });

  it('rejects malformed tokens', () => {
    expect(verifySignedDownloadToken('not-a-token', SECRET)).toBeNull();
    expect(verifySignedDownloadToken('', SECRET)).toBeNull();
  });
});
