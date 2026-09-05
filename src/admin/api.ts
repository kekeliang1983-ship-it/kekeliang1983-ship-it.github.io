// 后台接口统一封装：注入口令头 x-admin-token（与 vite.config 的 adminApiPlugin 门禁对应）。
// 口令由后台入口弹窗输入，存于 sessionStorage，刷新会话后需重新输入。
const TOKEN_KEY = 'lingjing_admin_token';

let token = '';
try {
  token = sessionStorage.getItem(TOKEN_KEY) || '';
} catch {
  /* sessionStorage 不可用时退化为内存变量 */
}

export function getAdminToken(): string {
  return token;
}

export function setAdminToken(t: string): void {
  token = t;
  try {
    sessionStorage.setItem(TOKEN_KEY, t);
  } catch {
    /* ignore */
  }
}

export function clearAdminToken(): void {
  token = '';
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/** 带口令头的管理后台 fetch；其余行为同原生 fetch */
export async function adminFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  return fetch(url, {
    ...opts,
    headers: {
      ...(opts.headers || {}),
      'x-admin-token': token,
    },
  });
}

/** 后台接口返回体（约定 { ok?: boolean, error?: string }） */
export interface AdminResult {
  ok?: boolean;
  error?: string;
  [k: string]: any;
}
