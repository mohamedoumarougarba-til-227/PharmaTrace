const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
function environment() {
  const state = { calls: [], demo: false, failure: null, reply: { ids: ['transfer-1'] }, keys: 0 };
  const client = {
    async rpc(name, args) {
      state.calls.push({ name, args });
      if (state.failure === 'throw') throw new Error('Network lost after commit');
      return { data: state.reply, error: state.failure === 'return' ? { code: '42501' } : null };
    },
    from() { throw new Error('Raw business writes forbidden'); },
  };
  const mocks = {
    '@react-native-async-storage/async-storage': { getItem: async () => state.demo ? 'true' : null },
    'expo-crypto': { randomUUID: () => `intent-${++state.keys}` },
    './supabase': { getSupabase: () => client },
  };
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(path.join(root, 'lib/businessWorkflows.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext('(function(require,module,exports){' + source + '\n})', {}, { filename: 'businessWorkflows.ts' })(
    name => { if (!mocks[name]) throw Error(`Unexpected import ${name}`); return mocks[name]; }, module, module.exports,
  );
  return { state, api: module.exports };
}
const transfer = { lot_id: 'lot-1', destinataire_id: 'pharmacy-1', quantite: 5, note: '  test  ' };
const request = { fabricant_id: 'maker-1', nom_medicament: 'M', dosage: '500mg', quantite: 5 };

test('transfer creation sends one atomic RPC, excluding client actor/status/stock', async () => {
  const { state, api } = environment();
  const ids = await api.createTransfers([{ ...transfer, expediteur_id: 'forged', statut: 'receptionne', quantite_actuelle: 100 }], {});
  assert.equal(ids[0], 'transfer-1');
  assert.equal(state.calls.length, 1);
  assert.equal(state.calls[0].name, 'create_lot_transfers');
  assert.deepEqual(Object.keys(state.calls[0].args).sort(), ['p_items', 'p_key']);
  assert.deepEqual(Object.keys(state.calls[0].args.p_items[0]).sort(), ['demande_id', 'destinataire_id', 'lot_id', 'note', 'quantite']);
  assert.equal(state.calls[0].args.p_items[0].note, 'test');
});
for (const failure of ['return', 'throw']) {
  test(`unknown outcome (${failure}) keeps the same idempotency key on retry`, async () => {
    const { state, api } = environment(); const intent = {};
    state.failure = failure;
    await assert.rejects(api.createTransfers([transfer], intent));
    state.failure = null;
    await api.createTransfers([transfer], intent);
    assert.equal(state.calls[0].args.p_key, state.calls[1].args.p_key);
    assert.equal(state.keys, 1);
  });
}
test('changed form produces a new operation key; separate forms are independent', async () => {
  const { state, api } = environment(); const intent = {};
  await api.createTransfers([transfer], intent);
  await api.createTransfers([{ ...transfer, quantite: 6 }], intent);
  await api.createTransfers([transfer], {});
  assert.equal(new Set(state.calls.map(c => c.args.p_key)).size, 3);
});
test('two simultaneous submits of one intent share a key', async () => {
  const { state, api } = environment(); const intent = {};
  await Promise.all([api.createTransfers([transfer], intent), api.createTransfers([transfer], intent)]);
  assert.equal(state.calls[0].args.p_key, state.calls[1].args.p_key);
});
test('bulk delivery is one RPC with each request link, without client-side stock math', async () => {
  const { state, api } = environment(); state.reply.ids = ['a', 'b'];
  await api.createTransfers([{ ...transfer, demande_id: 'r1' }, { ...transfer, demande_id: 'r2' }], {});
  assert.equal(state.calls.length, 1);
  assert.equal(state.calls[0].args.p_items[1].demande_id, 'r2');
});
test('request creation includes manual products but never client identity/decision', async () => {
  const { state, api } = environment();
  await api.createRequests([{ ...request, pharmacie_id: 'forged', statut: 'satisfait', transfert_id: 'forged' }], {});
  assert.equal(state.calls[0].name, 'create_stock_requests');
  assert.deepEqual(Object.keys(state.calls[0].args.p_items[0]).sort(), ['dosage', 'fabricant_id', 'forme_galenique', 'nom_medicament', 'note', 'quantite']);
});
for (const qty of [0, -1, 1.5, NaN, Infinity, 2147483648]) {
  test(`quantity ${qty} is rejected before any RPC`, async () => {
    const { state, api } = environment();
    assert.throws(() => api.createTransfers([{ ...transfer, quantite: qty }], {}));
    assert.throws(() => api.createRequests([{ ...request, quantite: qty }], {}));
    assert.equal(state.calls.length, 0);
  });
}
test('empty and oversized batches fail before an RPC', async () => {
  const { state, api } = environment();
  await assert.rejects(api.createTransfers([], {}));
  await assert.rejects(api.createRequests(Array(51).fill(request), {}));
  assert.equal(state.calls.length, 0);
});
for (const decision of ['annule', 'refuse', 'receptionne']) {
  test(`${decision} sends only the transfer ID, action and optional scanned identifier`, async () => {
    const { state, api } = environment(); state.reply = 'transfer-1';
    await api.decideTransfer('transfer-1', decision, decision === 'receptionne' ? 'MATCH-CODE' : undefined);
    assert.equal(state.calls[0].name, 'decide_lot_transfer');
    assert.deepEqual(Object.keys(state.calls[0].args).sort(), ['p_decision', 'p_identifier', 'p_transfer_id']);
    assert.equal(state.calls[0].args.p_identifier, decision === 'receptionne' ? 'MATCH-CODE' : null);
  });
}
test('bulk request decisions use one RPC and verify affected count', async () => {
  const { state, api } = environment(); state.reply = 2;
  await api.decideRequests(['r1', 'r2'], 'refuse', ' Motif ');
  assert.equal(state.calls.length, 1);
  assert.equal(state.calls[0].args.p_note, 'Motif');
  state.reply = 0;
  await assert.rejects(api.decideRequests(['r1'], 'annule'));
});
test('malformed responses never produce a claimed success', async () => {
  const { state, api } = environment();
  for (const reply of [null, {}, { ids: [] }, { ids: [null] }]) {
    state.reply = reply;
    await assert.rejects(api.createTransfers([transfer], {}));
  }
  state.reply = null;
  await assert.rejects(api.decideTransfer('t', 'annule'));
});
test('demo writes are explicitly disabled and never reach the real SDK', async () => {
  const { state, api } = environment(); state.demo = true;
  for (const call of [() => api.createTransfers([transfer], {}), () => api.createRequests([request], {}),
    () => api.decideTransfer('t', 'annule'), () => api.decideRequests(['r'], 'annule')]) {
    await assert.rejects(call(), /Simulation/);
  }
  assert.equal(state.calls.length, 0);
});
test('reconciliation error has a bounded and actionable message', () => {
  const { api } = environment();
  assert.match(api.workflowError({ code: '23514' }), /réconciliation opérateur/);
  assert.doesNotMatch(api.workflowError({ message: 'private internal credentials' }), /credentials/);
});

test('request lot selection requires the exact name, dosage and galenic form', () => {
  const { api } = environment();
  const product = { nom_medicament: 'M', dosage: '500mg', forme_galenique: 'Comprime' };
  assert.equal(api.matchesRequestedMedicine(product, product), true);
  for (const other of [{ ...product, nom_medicament: 'M plus' }, { ...product, dosage: '250mg' },
    { ...product, forme_galenique: 'Sirop' }]) {
    assert.equal(api.matchesRequestedMedicine(other, product), false);
  }
  assert.equal(api.matchesRequestedMedicine({ nom_medicament: 'M', dosage: null }, { nom_medicament: 'M', dosage: '' }), true);
});

// Guard against accidentally reintroducing a raw-write path in any touched screen.
for (const file of ['(fabricant)/nouveau-transfert', '(fabricant)/transferts', '(fabricant)/demandes',
  '(pharmacie)/transferts', '(pharmacie)/verifier', '(pharmacie)/demandes']) {
  test(`${file}: no remaining raw business INSERT/UPDATE or stock arithmetic`, () => {
    const source = fs.readFileSync(path.join(root, 'app', file + '.tsx'), 'utf8');
    assert.doesNotMatch(source, /\.(insert|update|delete)\s*\(/);
    assert.doesNotMatch(source, /quantite_actuelle:\s*(newQty|currentQty)/);
    assert.match(source, /from '..\/..\/lib\/businessWorkflows'/);
  });
}
