import { createHmac, timingSafeEqual } from 'node:crypto';

export interface SignedDownloadPayload {
  documentId: string;
  versionId: string;
  organizationId: string;
  /** Unix seconds. */
  exp: number;
}

function sign(json: string, secret: string): string {
  return createHmac('sha256', secret).update(json).digest('base64url');
}

/**
 * Standard signed-URL pattern (HMAC + short expiry + constant-time compare),
 * the same shape S3 presigned URLs use: the token itself is the credential,
 * scoped to exactly one document version, valid for a few minutes. Backs the
 * public (unauthenticated-by-JWT) file-serving route so the browser can
 * download/open a document directly without attaching a bearer header.
 */
export function createSignedDownloadToken(payload: SignedDownloadPayload, secret: string): string {
  const json = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${json}.${sign(json, secret)}`;
}

export function verifySignedDownloadToken(token: string, secret: string): SignedDownloadPayload | null {
  const [json, signature] = token.split('.');
  if (!json || !signature) return null;

  const expected = sign(json, secret);
  const provided = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (provided.length !== expectedBuf.length || !timingSafeEqual(provided, expectedBuf)) {
    return null;
  }

  let payload: SignedDownloadPayload;
  try {
    payload = JSON.parse(Buffer.from(json, 'base64url').toString('utf8'));
  } catch {
    return null;
  }

  if (
    typeof payload.exp !== 'number' ||
    !payload.documentId ||
    !payload.versionId ||
    !payload.organizationId ||
    Date.now() / 1000 > payload.exp
  ) {
    return null;
  }

  return payload;
}
