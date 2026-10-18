import test from 'node:test'; import assert from 'node:assert/strict';
import * as api from './cards-api.js';
const cfg = { supabaseUrl: 'https://x.supabase.co/', anonKey: 'anon' };
const reply = (status, body) => async () => ({ ok: status < 400, status, json: async () => body });
test('unconfigured', async () => { globalThis.CARD_CONFIG = undefined; await assert.rejects(api.getCard('abcdefghijk'), { code: 'unconfigured' }); });
test('create maps ids and calls the RPC path', async () => {
  globalThis.CARD_CONFIG = cfg; let url;
  globalThis.fetch = async (u, o) => { url = u; return reply(200, { share_id: 'abcdefghijk', edit_token: 't'.repeat(32) })(); };
  const r = await api.createCard({ to: 'A', from: 'B', msg: 'm', skin: 'rose', ph: {}, st: [] });
  assert.equal(url, 'https://x.supabase.co/rest/v1/rpc/create_card'); assert.equal(r.shareId, 'abcdefghijk');
});
test('known server error is mapped to Vietnamese, code kept', async () => {
  globalThis.CARD_CONFIG = cfg; globalThis.fetch = reply(400, { message: 'rate_limited' });
  await assert.rejects(api.createCard({}), e => e.code === 'rate_limited' && /thử lại/.test(e.message));
});
test('unknown server error does not leak internals', async () => {
  globalThis.CARD_CONFIG = cfg; globalThis.fetch = reply(500, { message: 'relation "cards" does not exist' });
  await assert.rejects(api.deleteCard('abcdefghijk', 'x'.repeat(20)), e => e.code === 'unknown' && !/relation/.test(e.message));
});
test('network failure', async () => { globalThis.CARD_CONFIG = cfg; globalThis.fetch = async () => { throw new TypeError('x'); }; await assert.rejects(api.getCard('abcdefghijk'), { code: 'network' }); });
test('invalid share id returns null without a request', async () => {
  globalThis.CARD_CONFIG = cfg; let hit = false; globalThis.fetch = async () => { hit = true; };
  assert.equal(await api.getCard('<script>'), null); assert.equal(hit, false);
});
test('missing/unpublished card -> null', async () => { globalThis.CARD_CONFIG = cfg; globalThis.fetch = reply(200, null); assert.equal(await api.getCard('abcdefghijk'), null); });
test('route + share url', () => {
  assert.equal(api.parseRoute('#/card/abcdefghijk'), 'abcdefghijk'); assert.equal(api.parseRoute('#/card/../x'), null);
  assert.equal(api.shareUrl('abcdefghijk', 'https://e.io/20-10/'), 'https://e.io/20-10/#/card/abcdefghijk');
});
test('state round-trip', () => {
  const S = { to: 'Lan', from: 'Cường', msg: 'Chúc mừng', skin: 'sage', title: 't', close: 'c', ps: '', fin: 'f', ph: { pink: [1, 'x'] }, st: [] };
  assert.deepEqual(api.fromServer(api.toServer(S)), S);
});

test('owner operations reject malformed ids and tokens before network calls', async () => {
  globalThis.CARD_CONFIG = cfg; let hit = false;
  globalThis.fetch = async () => { hit = true; return reply(200, { ok: true })(); };
  assert.equal(await api.getCardForEdit('../bad', 'not-a-token'), null);
  await assert.rejects(api.updateCard('abcdefghijk', 'short', {}), { code: 'forbidden' });
  await assert.rejects(api.deleteCard('wrong', 't'.repeat(32)), { code: 'forbidden' });
  await assert.rejects(api.setStatus('abcdefghijk', 't'.repeat(32), 'admin'), { code: 'invalid_card' });
  assert.equal(hit, false);
});
test('token storage reports blocked storage and filters invalid tokens', () => {
  globalThis.localStorage = {
    setItem() { throw new Error('blocked'); },
    getItem() { return 'bad token'; }
  };
  assert.equal(api.keepToken('abcdefghijk', 't'.repeat(32)), false);
  assert.equal(api.recallToken('abcdefghijk'), null);
  delete globalThis.localStorage;
});
