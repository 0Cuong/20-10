import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const read = (file) => fs.readFileSync(path.join(dist, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(dist, file));

assert.ok(fs.existsSync(dist), 'dist/ must exist; run npm run build first');

const index = read('index.html');
assert.match(index, /20_10\.html/, 'index must link/redirect to the main card');
const page = read('20_10.html');
assert.match(page, /Một Lá Thư Dành Riêng Cho Bạn/, 'card title should be present');
assert.match(page, /assets\/[^"']+\.js/, 'built card JavaScript must be referenced');

const localRefs = [...page.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
  .map((match) => match[1])
  .filter((ref) => !/^(?:[a-z]+:|\/\/|data:|#)/i.test(ref));

const missing = [];
for (const ref of localRefs) {
  const url = new URL(ref, 'https://smoke.test/20_10.html');
  const localPath = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  if (!exists(localPath)) missing.push({ ref, localPath });
}
assert.deepEqual(missing, [], 'all local files referenced by the built HTML must exist');

for (const required of [
  'photo_pink.webp',
  'stickers/bunny-flowers.webp',
  'stickers/downloads/sticker-001.webp'
]) {
  assert.ok(exists(required), `required static asset missing: ${required}`);
}

const scriptRef = localRefs.find((ref) => /assets\/[^"']+\.js$/.test(ref));
assert.ok(scriptRef, 'compiled application bundle not found');
const bundlePath = decodeURIComponent(new URL(scriptRef, 'https://smoke.test/20_10.html').pathname).replace(/^\/+/, '');
const bundle = read(bundlePath);
assert.match(bundle, /Lưu trực tuyến/, 'Supabase save/publish UI should be bundled');
assert.match(bundle, /Tạo mã QR|cloud-qr-btn/, 'QR sharing code should be bundled');
assert.match(bundle, /Ảnh trang trí 001/, 'sticker catalog should be bundled');

const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
assert.equal(vercel.cleanUrls, true, 'Vercel should support clean URLs such as /20_10');
assert.equal(vercel.trailingSlash, false, 'Vercel should avoid trailing slash redirects');

console.log('Smoke test passed: index, card HTML, compiled modules, local assets, stickers, and Vercel URL config.');
