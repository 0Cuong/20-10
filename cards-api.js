// Client cho lớp RPC của Supabase. Không phụ thuộc thư viện nào.
// Cần: window.CARD_CONFIG = { supabaseUrl, anonKey }  (anon key là khoá công khai; KHÔNG đưa service_role vào đây)
export class ApiError extends Error { constructor(code, message) { super(message); this.name = 'ApiError'; this.code = code; } }
const MSG = {
  rate_limited: 'Bạn tạo thiệp hơi nhanh — hãy thử lại sau ít phút.',
  forbidden: 'Bạn không có quyền sửa thiệp này.',
  invalid_card: 'Nội dung thiệp chưa hợp lệ. Hãy kiểm tra tên và lời nhắn.',
  unavailable: 'Hệ thống đang bận, hãy thử lại.',
  network: 'Không kết nối được. Kiểm tra mạng rồi thử lại.',
  unconfigured: 'Chưa cấu hình nơi lưu thiệp.',
  unknown: 'Có lỗi xảy ra, hãy thử lại sau.'
};
const fail = c => new ApiError(c, MSG[c]);
export const SHARE_ID = /^[A-Za-z0-9_-]{11}$/;

async function rpc(name, args, timeout = 10000) {
  const { supabaseUrl: u, anonKey: k } = globalThis.CARD_CONFIG || {};
  if (!u || !k) throw fail('unconfigured');
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), timeout);
  let res;
  try {
    res = await fetch(`${u.replace(/\/$/, '')}/rest/v1/rpc/${name}`, {
      method: 'POST', signal: ac.signal, body: JSON.stringify(args),
      headers: { apikey: k, Authorization: 'Bearer ' + k, 'Content-Type': 'application/json' }
    });
  } catch (error) { throw fail(error?.name === 'AbortError' ? 'unavailable' : 'network'); } finally { clearTimeout(t); }
  let body = null; try { body = await res.json(); } catch { /* no body */ }
  if (!res.ok) { const m = body && typeof body.message === 'string' ? body.message : ''; throw fail(Object.hasOwn(MSG, m) ? m : 'unknown'); }
  return body;
}

export const toServer = S => ({ recipient_name: S.to, sender_name: S.from, message: S.msg, theme: S.skin,
  content: { title: S.title, close: S.close, ps: S.ps, fin: S.fin, ph: S.ph, st: S.st } });
export const fromServer = r => r ? ({ to: r.recipient_name, from: r.sender_name, msg: r.message, skin: r.theme, ...r.content, ...(r.status ? { status: r.status } : {}) }) : null;

const validToken = token => typeof token === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(token);
const requireOwner = (id, token) => { if (!SHARE_ID.test(id) || !validToken(token)) throw fail('forbidden'); };

export async function createCard(S) { const r = await rpc('create_card', { p_card: toServer(S) }); return { shareId: r.share_id, editToken: r.edit_token }; }
export async function getCard(shareId) { if (typeof shareId !== 'string' || !SHARE_ID.test(shareId)) return null; const r = await rpc('get_card', { p_share_id: shareId }); return r && fromServer(r); }
export async function getCardForEdit(id, tok) { if (typeof id !== 'string' || !SHARE_ID.test(id) || !validToken(tok)) return null; return fromServer(await rpc('get_card_for_edit', { p_share_id: id, p_token: tok })); }
export const updateCard = async (id, tok, S) => { requireOwner(id, tok); return rpc('update_card', { p_share_id: id, p_token: tok, p_card: toServer(S) }); };
export const setStatus = async (id, tok, status) => { requireOwner(id, tok); if (!['draft', 'published'].includes(status)) throw fail('invalid_card'); return rpc('set_card_status', { p_share_id: id, p_token: tok, p_status: status }); };
export const deleteCard = async (id, tok) => { requireOwner(id, tok); return rpc('delete_card', { p_share_id: id, p_token: tok }); };

// Route dạng hash để F5/mở trực tiếp luôn chạy trên hosting tĩnh (GitHub Pages): trang#/card/<share_id>
export const shareUrl = (id, base = location.href.split('#')[0]) => `${base}#/card/${id}`;
export const parseRoute = (hash = location.hash) => { const m = /^#\/card\/([A-Za-z0-9_-]{11})$/.exec(hash); return m ? m[1] : null; };
// Quyền sửa chỉ nằm trong trình duyệt của người tạo
export const keepToken = (id, t) => { try { localStorage.setItem('card:' + id, t); return true; } catch { return false; } };
export const recallToken = id => { try { const token = localStorage.getItem('card:' + id); return validToken(token) ? token : null; } catch { return null; } };
