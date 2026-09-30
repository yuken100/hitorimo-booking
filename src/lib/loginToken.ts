import { createHash, randomBytes } from 'crypto';

export const LOGIN_LINK_TTL_MS = 15 * 60 * 1000;

export const newLoginToken = () => randomBytes(32).toString('base64url');

// データベースには、トークンそのものではなくハッシュだけを保存する
export const hashLoginToken = (token: string) => createHash('sha256').update(token).digest('hex');
