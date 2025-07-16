import { Request } from 'express';
import crypto from 'crypto';

/**
 * Webhook 서명 검증
 * @param req Express Request 객체 (rawBody 필요)
 * @returns boolean — 검증 성공 여부
 */
export function verifyWebhookSignature(req: Request): boolean {
  const secret = process.env.IAMPORT_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('⚠️  IAMPORT_WEBHOOK_SECRET 가 설정되지 않았습니다. 임시로 서명 검증을 통과시킵니다.');
    return true; // 비활성화 (데모 목적)
  }

  // 1) 헤더에서 전달된 서명 추출
  const signatureFromHeader = req.headers['x-iamport-signature'] as string | undefined;
  if (!signatureFromHeader) return false;

  // 2) Raw Body 확보 (body‑parser 의 raw 옵션 또는 별도 미들웨어 필요)
  const rawBody = (req as any).rawBody as Buffer | undefined;
  if (!rawBody) {
    console.error('rawBody 가 설정되어 있지 않습니다. body-parser raw 설정 필요');
    return false;
  }

  // 3) HMAC 계산 (HMAC‑SHA256)
  const computed = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  // 4) 서명 비교(대소문자 무시)
  return computed.toLowerCase() === signatureFromHeader.toLowerCase();
}
