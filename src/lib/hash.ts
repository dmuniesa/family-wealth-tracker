import crypto from 'crypto';

export function computeSourceHash(
  accountId: number,
  date: string,
  amount: number,
  description: string,
  detail: string
): string {
  const raw = `${accountId}|${date}|${amount}|${description}|${detail || ''}`;
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}
