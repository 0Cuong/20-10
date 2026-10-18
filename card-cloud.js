import QRCode from 'qrcode';
import {
  createCard, getCard, getCardForEdit, updateCard, setStatus,
  shareUrl, parseRoute, keepToken, recallToken
} from './cards-api.js';

const env = import.meta.env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const anonKey = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY || '';
if (supabaseUrl && anonKey) globalThis.CARD_CONFIG = { supabaseUrl, anonKey };

const app = globalThis.CARD_APP;
const editor = document.querySelector('#ed');
const statusLine = document.querySelector('#route-status');
const state = { shareId: null, token: null, status: 'draft', busy: false };

const tools = document.createElement('section');
tools.id = 'cloud-tools';
tools.innerHTML = `
  <h3>Lưu trực tuyến &amp; chia sẻ nhanh</h3>
  <p class="note">Lưu/xuất bản trực tuyến cần cấu hình Supabase và áp migration SQL trước. Bạn vẫn có thể gửi link cục bộ hoặc tạo QR.</p>
  <div class="ac">
    <button class="btn" id="cloud-save" type="button">Lưu bản nháp</button>
    <button class="btn p" id="cloud-publish" type="button">Xuất bản</button>
    <button class="btn" id="cloud-share" type="button">Chia sẻ link</button>
    <button class="btn" id="cloud-qr-btn" type="button">Tạo mã QR</button>
  </div>
  <p id="cloud-msg" role="status" aria-live="polite" aria-atomic="true"></p>
  <a id="cloud-link" hidden></a>
  <canvas id="cloud-qr" width="240" height="240" aria-label="Mã QR mở thiệp" hidden></canvas>`;
editor.append(tools);

const $ = (selector) => tools.querySelector(selector);
const cloudMsg = (message) => { $('#cloud-msg').textContent = message; app.say(message); };
const markRouteError = (message) => {
  statusLine.textContent = message;
  statusLine.hidden = false;
};
const setBusy = (busy) => {
  state.busy = busy;
  tools.querySelectorAll('button').forEach((button) => { button.disabled = busy; });
};
const currentUrl = () => state.shareId ? shareUrl(state.shareId, location.href.split('#')[0]) : app.getLocalLink();
const updateLink = (url, label = 'Mở link thiệp') => {
  const link = $('#cloud-link');
  link.href = url;
  link.textContent = `${label}: ${url}`;
  link.hidden = false;
};
const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const input = document.createElement('textarea');
    input.value = text;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.append(input);
    input.select();
    let copied = false;
    try { copied = document.execCommand('copy'); } catch { /* Clipboard not available */ }
    input.remove();
    return copied;
  }
};

async function saveDraft() {
  if (!globalThis.CARD_CONFIG) throw new Error('Chưa cấu hình Supabase.');
  if (!state.shareId || !state.token) {
    const created = await createCard(app.getState());
    state.shareId = created.shareId;
    state.token = created.editToken;
    state.status = 'draft';
    keepToken(state.shareId, state.token);
    history.replaceState(null, '', `${location.pathname}${location.search}#/card/${state.shareId}`);
  } else {
    await updateCard(state.shareId, state.token, app.getState());
  }
  return shareUrl(state.shareId, location.href.split('#')[0]);
}

async function loadCloudRoute() {
  const shareId = parseRoute();
  if (!shareId) return;
  if (!globalThis.CARD_CONFIG) {
    markRouteError('Thiệp trực tuyến chưa được cấu hình. Bạn vẫn có thể mở link/mã thiệp cũ.');
    return;
  }
  statusLine.textContent = 'Đang tải thiệp…';
  statusLine.hidden = false;
  try {
    const token = recallToken(shareId);
    const card = token ? await getCardForEdit(shareId, token) : await getCard(shareId);
    if (!card) throw new Error('Không tìm thấy thiệp đã xuất bản hoặc thiệp đã hết hạn.');
    state.shareId = shareId;
    state.token = token;
    state.status = card.status || 'published';
    app.setState(card);
    app.setRecipient(!token);
    statusLine.hidden = true;
    if (token) cloudMsg(state.status === 'published' ? 'Đã mở thiệp của bạn (đang xuất bản).' : 'Đã mở bản nháp của bạn.');
  } catch (error) {
    markRouteError(error.message || 'Không tải được thiệp. Hãy thử lại sau.');
  }
}

$('#cloud-save').addEventListener('click', async () => {
  setBusy(true);
  try {
    const url = await saveDraft();
    if (state.status !== 'draft') await setStatus(state.shareId, state.token, 'draft');
    state.status = 'draft';
    updateLink(url, 'Link thiệp nháp (chỉ bạn mở được)');
    cloudMsg('Đã lưu bản nháp. Quyền chỉnh sửa được giữ trên trình duyệt này.');
  } catch (error) { cloudMsg(error.message || 'Lưu thiệp chưa thành công.'); }
  finally { setBusy(false); }
});

$('#cloud-publish').addEventListener('click', async () => {
  setBusy(true);
  try {
    await saveDraft();
    await setStatus(state.shareId, state.token, 'published');
    state.status = 'published';
    const url = shareUrl(state.shareId, location.href.split('#')[0]);
    updateLink(url, 'Link thiệp đã xuất bản');
    cloudMsg('Thiệp đã được xuất bản. Bạn có thể chia sẻ link hoặc tạo mã QR.');
  } catch (error) { cloudMsg(error.message || 'Xuất bản chưa thành công.'); }
  finally { setBusy(false); }
});

$('#cloud-share').addEventListener('click', async () => {
  const url = currentUrl();
  if (state.shareId && state.status !== 'published') {
    cloudMsg('Hãy xuất bản thiệp trước khi gửi link Supabase.');
    return;
  }
  updateLink(url, state.shareId ? 'Link thiệp đã xuất bản' : 'Link thiệp');
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Một Lá Thư Dành Riêng Cho Bạn', text: 'Mình gửi bạn một tấm thiệp nhỏ ♡', url });
      cloudMsg('Đã mở bảng chia sẻ.');
    } else if (await copyText(url)) cloudMsg('Đã sao chép link thiệp.');
    else cloudMsg('Link đã hiện bên dưới; hãy chạm giữ để sao chép.');
  } catch (error) {
    if (error.name !== 'AbortError') cloudMsg('Link thiệp đã hiện bên dưới để bạn sao chép.');
  }
});

$('#cloud-qr-btn').addEventListener('click', async () => {
  if (state.shareId && state.status !== 'published') {
    cloudMsg('Hãy xuất bản thiệp trước khi tạo QR cho link Supabase.');
    return;
  }
  const url = currentUrl();
  try {
    const canvas = $('#cloud-qr');
    await QRCode.toCanvas(canvas, url, { width: 240, margin: 2, errorCorrectionLevel: 'M' });
    canvas.hidden = false;
    updateLink(url, state.shareId ? 'Link thiệp đã xuất bản' : 'Link thiệp');
    cloudMsg('Đã tạo mã QR. Người nhận quét mã để mở thiệp.');
  } catch { cloudMsg('Chưa tạo được mã QR.'); }
});

if (!globalThis.CARD_CONFIG) {
  $('#cloud-save').disabled = true;
  $('#cloud-publish').disabled = true;
  $('#cloud-msg').textContent = 'Chưa cấu hình Supabase; chia sẻ link và QR cục bộ vẫn dùng được.';
} else {
  loadCloudRoute();
}
