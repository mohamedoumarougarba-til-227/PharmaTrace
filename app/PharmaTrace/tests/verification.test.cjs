const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const realLot = {
  numero_lot: 'REAL-2026-001', nom_medicament: 'Lot de test réel',
  dosage: '10mg', date_expiration: '2099-12-31', etat: 'enregistre',
  fabricant_public: 'Fabricant de test',
};

// Load the actual TypeScript modules and screens. Every native/SDK import is
// replaced here; these tests cannot initialize a real Supabase or camera client.
function environment() {
  const storage = new Map();
  const state = {
    lookup: { data: null, error: null }, lookupCalls: 0, insertCalls: 0, authCalls: 0,
    sdkCalls: 0, readThrows: false, journalFailure: null, storageFailure: false,
    journalWait: null, pendingFailure: false, session: { user: { id: 'fixture-pharmacy' } },
    rpcCalls: [], pendingData: null, routeParams: {}, workflowProfile: null,
    workflowCatalog: [], workflowPartners: [], workflowError: null,
  };
  const client = {
    auth: { async getSession() { state.authCalls++; return { data: { session: state.session }, error: null }; } },
    async rpc(name, args) {
      state.rpcCalls.push({ name, args });
      if (name === 'get_my_profile') return { data: state.workflowProfile, error: state.workflowError };
      if (name === 'get_manufacturer_catalog') return { data: state.workflowCatalog, error: state.workflowError };
      if (name === 'get_business_partners') return { data: state.workflowPartners, error: state.workflowError };
      assert.deepEqual(Object.keys(args), ['p_identifier']);
      if (name === 'verify_public_lot') {
        state.lookupCalls++;
        if (state.readThrows) throw new Error('Injected read rejection');
        const response = await (typeof state.lookup === 'function' ? state.lookup() : state.lookup);
        return { ...response, data: response.data === null ? [] : Array.isArray(response.data) ? response.data : [response.data] };
      }
      assert.equal(name, 'record_verification_scan');
      state.insertCalls++; // RPC journal calls, never raw INSERTs.
      if (state.journalWait) await state.journalWait;
      if (state.journalFailure === 'throw') throw new Error('Injected journal rejection');
      return { error: state.journalFailure === 'return' ? new Error('Injected journal error') : null };
    },
    from(table) {
      assert.equal(table, 'transferts', 'Verification may only enrich an authorized transfer; no raw lots/profiles/scans');
      return {
        select() { return this; }, eq() { return this; },
        async maybeSingle() {
          if (table === 'transferts' && state.pendingFailure) throw new Error('Injected transfer rejection');
          return { data: state.pendingData, error: null };
        },
      };
    },
  };
  const hooks = [];
  let cursor = 0;
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in hooks)) hooks[i] = typeof initial === 'function' ? initial() : initial;
      return [hooks[i], value => { hooks[i] = typeof value === 'function' ? value(hooks[i]) : value; }];
    },
    useRef(initial) {
      const i = cursor++;
      if (!(i in hooks)) hooks[i] = { current: initial };
      return hooks[i];
    },
    useEffect() {},
  };
  const jsx = (type, props) => ({ type, props });
  const native = Object.fromEntries(['View', 'Text', 'TextInput', 'TouchableOpacity', 'ScrollView', 'ActivityIndicator'].map(name => [name, name]));
  native.StyleSheet = { create: value => value, absoluteFillObject: {} };
  native.useWindowDimensions = () => ({ width: 390, height: 844 });
  native.Alert = { alert() {} };
  const mocks = {
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-native': native,
    'react-native-url-polyfill/auto': {},
    '@react-native-async-storage/async-storage': {
      async getItem(key) {
        if (state.storageFailure) throw new Error('Injected storage rejection');
        return storage.get(key) ?? null;
      },
    },
    '@supabase/supabase-js': { createClient() { state.sdkCalls++; return client; } },
    'expo-router': { router: { replace() {}, back() {} }, useLocalSearchParams: () => state.routeParams },
    'expo-status-bar': { StatusBar: 'StatusBar' },
    'expo-camera': { CameraView: 'CameraView', useCameraPermissions: () => [{ granted: false }, async () => ({ granted: false })] },
  };
  const cache = new Map();
  function load(file) {
    file = path.resolve(file);
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: file,
    }).outputText;
    const requireStub = name => {
      if (name in mocks) return mocks[name];
      if (name.endsWith('/constants/icons')) return { FAIcon: 'FAIcon' };
      if (name.endsWith('/components/ConfirmModal')) return { __esModule: true, default: 'ConfirmModal' };
      if (name.startsWith('.')) {
        const base = path.resolve(path.dirname(file), name);
        const target = ['.ts', '.tsx'].map(ext => base + ext).find(candidate => fs.existsSync(candidate));
        if (target) return load(target);
      }
      throw new Error(`Unmocked import forbidden: ${name}`);
    };
    vm.runInNewContext('(function(require,module,exports){' + source + '\n})', {
      URL, Date, setTimeout, console: { warn() {}, error() {} }, process: { env: {} },
    }, { filename: file })(requireStub, module, module.exports);
    return module.exports;
  }
  const verification = load(path.join(root, 'lib/verification.ts'));
  const db = load(path.join(root, 'lib/supabase.ts'));
  function screen(kind) {
    const Component = load(path.join(root, kind === 'public' ? 'app/(public)/verify.tsx' : 'app/(pharmacie)/verifier.tsx')).default;
    function render() { cursor = 0; return Component(); }
    function nodes(node) {
      if (node == null || typeof node === 'boolean') return [];
      if (Array.isArray(node)) return node.flatMap(nodes);
      if (typeof node !== 'object') return [node];
      if (typeof node.type === 'function') return nodes(node.type(node.props));
      return [node, ...nodes(node.props?.children)];
    }
    return {
      submit(code) {
        nodes(render()).find(node => node.type === 'TextInput').props.onChangeText(code);
        return nodes(render()).find(node => node.type === 'TextInput').props.onSubmitEditing();
      },
      reset() {
        const button = nodes(render()).find(node => node.type === 'TouchableOpacity'
          && nodes(node.props.children).some(child => typeof child === 'string' && /Scanner un autre|Vérifier un autre|Revenir à la vérification/.test(child)));
        assert.ok(button, 'The result offers a way back to verification');
        button.props.onPress();
      },
      text() { return nodes(render()).filter(node => typeof node === 'string').join(' '); },
    };
  }
  const workflow = load(path.join(root, 'lib/workflowReads.ts'));
  return { state, storage, verification, workflow, db, screen };
}

for (const kind of ['public', 'pharmacie']) {
  for (const code of ['FAB-2026-049', 'ORDINARY-2026']) {
    test(`${kind}: returned backend error for ${code} is UNAVAILABLE, never a verdict`, async () => {
      const env = environment();
      env.state.lookup = { data: null, error: new Error('Backend unavailable') };
      const result = await env.verification.verifyMedication(code);
      assert.equal(result.status, 'UNAVAILABLE');
      assert.equal('lot' in result, false);
      const ui = env.screen(kind);
      await ui.submit(code);
      assert.match(ui.text(), /Vérification indisponible/);
      assert.doesNotMatch(ui.text(), /authentique|suspect|contrefaçon|Amoxicilline|Laboratoire Niger Pharma/i);
      assert.equal(env.state.insertCalls, 0);
    });
  }

  test(`${kind}: rejected lookup is UNAVAILABLE`, async () => {
    const env = environment();
    env.state.readThrows = true;
    const ui = env.screen(kind);
    await ui.submit('FAB-2026-049');
    assert.match(ui.text(), /Vérification indisponible/);
    assert.doesNotMatch(ui.text(), /authentique|suspect/i);
  });

  test(`${kind}: successful empty lookup is NOT_FOUND`, async () => {
    const env = environment();
    assert.equal((await env.verification.verifyMedication('UNKNOWN-2026')).status, 'NOT_FOUND');
    const ui = env.screen(kind);
    await ui.submit('UNKNOWN-2026');
    assert.match(ui.text(), /Lot non trouvé/);
    assert.doesNotMatch(ui.text(), /indisponible|suspect|contrefaçon/i);
  });

  test(`${kind}: successful real lookup is FOUND`, async () => {
    const env = environment();
    env.state.lookup = { data: realLot, error: null };
    const result = await env.verification.verifyMedication(realLot.numero_lot);
    assert.equal(result.status, 'FOUND');
    assert.equal(result.source, 'real');
    assert.equal(result.lot.numero_lot, realLot.numero_lot);
    assert.equal('id' in result.lot, false);
    const ui = env.screen(kind);
    await ui.submit(realLot.numero_lot);
    assert.match(ui.text(), /Lot de test réel/);
    assert.doesNotMatch(ui.text(), /DÉMONSTRATION|indisponible|suspect/i);
  });

  for (const failure of ['return', 'throw']) {
    test(`${kind}: journal ${failure} preserves FOUND and reports a secondary failure`, async () => {
      const env = environment();
      env.state.lookup = { data: realLot, error: null };
      env.state.journalFailure = failure;
      const result = await env.verification.verifyMedication(realLot.numero_lot);
      assert.equal(await env.verification.journalVerificationScan(result, kind), 'FAILED');
      assert.equal(result.status, 'FOUND');
      assert.equal(result.lot.numero_lot, realLot.numero_lot);
      const ui = env.screen(kind);
      await ui.submit(realLot.numero_lot);
      assert.match(ui.text(), /Lot de test réel/);
      assert.match(ui.text(), /résultat est conservé.*scan n’a pas pu être enregistré/);
      assert.doesNotMatch(ui.text(), /Vérification indisponible|Lot non trouvé|suspect/i);
    });
  }

  test(`${kind}: result is visible before a pending journal completes`, async () => {
    const env = environment();
    env.state.lookup = { data: realLot, error: null };
    let release;
    env.state.journalWait = new Promise(resolve => { release = resolve; });
    const ui = env.screen(kind);
    const submission = ui.submit(realLot.numero_lot);
    await new Promise(resolve => setImmediate(resolve));
    assert.match(ui.text(), /Lot de test réel/);
    release();
    await submission;
  });

  test(`${kind}: failed journal also preserves NOT_FOUND`, async () => {
    const env = environment();
    env.state.journalFailure = 'throw';
    const ui = env.screen(kind);
    await ui.submit('UNKNOWN-2026');
    assert.match(ui.text(), /Lot non trouvé/);
    assert.match(ui.text(), /résultat est conservé/);
    assert.doesNotMatch(ui.text(), /Vérification indisponible|suspect/i);
  });

  test(`${kind}: a late journal failure cannot contaminate a subsequent lookup`, async () => {
    const env = environment();
    env.state.lookup = { data: realLot, error: null };
    let release;
    env.state.journalWait = new Promise(resolve => { release = resolve; });
    env.state.journalFailure = 'throw';
    const ui = env.screen(kind);
    const first = ui.submit(realLot.numero_lot);
    await new Promise(resolve => setImmediate(resolve));
    ui.reset();
    env.state.lookup = { data: null, error: new Error('Second lookup unavailable') };
    await ui.submit('SECOND-LOOKUP');
    release();
    await first;
    assert.match(ui.text(), /Vérification indisponible/);
    assert.doesNotMatch(ui.text(), /résultat est conservé|Lot de test réel/);
  });

  test(`${kind}: failed journal preserves the existing expired presentation`, async () => {
    const env = environment();
    env.state.lookup = { data: { ...realLot, date_expiration: '2000-01-01' }, error: null };
    env.state.journalFailure = 'return';
    const ui = env.screen(kind);
    await ui.submit(realLot.numero_lot);
    assert.match(ui.text(), /EXPIRÉ|Lot Expiré/);
    assert.match(ui.text(), /résultat est conservé/);
  });

  test(`${kind}: empty and malformed input issue no lookup or journal`, async () => {
    for (const code of ['', '   ', 'x'.repeat(101), 'FAB-1,hash_sha256.neq.x', 'https://example.test/verify?hash=']) {
      const env = environment();
      assert.equal((await env.verification.verifyMedication(code)).status, 'INVALID_INPUT');
      const ui = env.screen(kind);
      await ui.submit(code);
      assert.match(ui.text(), /Code invalide/);
      assert.equal(env.state.lookupCalls, 0);
      assert.equal(env.state.authCalls, 0);
      assert.equal(env.state.insertCalls, 0);
    }
  });

  test(`${kind}: known demo code displays only its matching simulated lot`, async () => {
    const env = environment();
    env.storage.set('pt_demo_mode', 'true');
    const code = 'PAR-2026-018';
    const result = await env.verification.verifyMedication(code);
    assert.equal(result.status, 'FOUND');
    assert.equal(result.source, 'demo');
    assert.equal(result.lot.numero_lot, code);
    const ui = env.screen(kind);
    await ui.submit(code);
    assert.match(ui.text(), /Paracétamol Sirop/);
    assert.match(ui.text(), /DÉMONSTRATION.*Données simulées.*Aucune validation du backend réel/);
    assert.doesNotMatch(ui.text(), /Amoxicilline/);
    assert.equal(env.state.sdkCalls, 0);
  });

  test(`${kind}: unknown demo code never selects the first lot`, async () => {
    const env = environment();
    env.storage.set('pt_demo_mode', 'true');
    assert.equal((await env.verification.verifyMedication('FAB-UNKNOWN')).status, 'NOT_FOUND');
    const ui = env.screen(kind);
    await ui.submit('FAB-UNKNOWN');
    assert.match(ui.text(), /Lot non trouvé/);
    assert.match(ui.text(), /DÉMONSTRATION/);
    assert.doesNotMatch(ui.text(), /Amoxicilline|authentique|suspect/i);
    assert.equal(env.state.sdkCalls, 0);
  });

  test(`${kind}: demo exception cannot fall back to a positive or real result`, async () => {
    const env = environment();
    env.storage.set('pt_demo_mode', 'true');
    env.db.MOCK_LOTS.filter = () => { throw new Error('Injected demo failure'); };
    const ui = env.screen(kind);
    await ui.submit('FAB-2026-049');
    assert.match(ui.text(), /Vérification indisponible/);
    assert.match(ui.text(), /DÉMONSTRATION/);
    assert.doesNotMatch(ui.text(), /Amoxicilline|authentique|suspect/i);
    assert.equal(env.state.sdkCalls, 0);
  });
}

test('demo lookup accepts a known hash and its existing QR URL', async () => {
  const env = environment();
  env.storage.set('pt_demo_mode', 'true');
  const lot = env.db.MOCK_LOTS[1];
  for (const code of [lot.hash_sha256, lot.qr_code_url]) {
    const result = await env.verification.verifyMedication(code);
    assert.equal(result.status, 'FOUND');
    assert.equal(result.lot.id, lot.id);
    assert.equal(result.source, 'demo');
  }
  assert.equal(env.state.sdkCalls, 0);
});

test('storage failure does not silently switch source or query a backend', async () => {
  const env = environment();
  env.state.storageFailure = true;
  assert.equal((await env.verification.verifyMedication('FAB-2026-049')).status, 'UNAVAILABLE');
  assert.equal(env.state.sdkCalls, 0);
});

test('ambiguous demo matches are unavailable instead of selecting the first lot', async () => {
  const env = environment();
  env.storage.set('pt_demo_mode', 'true');
  env.db.MOCK_LOTS.push({ ...env.db.MOCK_LOTS[0], id: 'duplicate-demo-lot' });
  const result = await env.verification.verifyMedication('FAB-2026-049');
  assert.equal(result.status, 'UNAVAILABLE');
  assert.equal(result.source, 'demo');
  assert.equal(env.state.sdkCalls, 0);
});

test('malformed successful payload cannot manufacture FOUND', async () => {
  const env = environment();
  for (const data of [undefined, {}, { ...realLot, date_expiration: 'invalid' }]) {
    env.state.lookup = { data, error: null };
    assert.equal((await env.verification.verifyMedication('FAB-2026-049')).status, 'UNAVAILABLE');
  }
});

test('invalid and unavailable lookups are never journaled', async () => {
  const env = environment();
  for (const result of [{ status: 'INVALID_INPUT' }, { status: 'UNAVAILABLE', source: 'real' }]) {
    assert.equal(await env.verification.journalVerificationScan(result, 'public'), 'SKIPPED');
  }
  assert.equal(env.state.sdkCalls, 0);
});

test('a demo result remains local if the mode changes before journaling', async () => {
  const env = environment();
  env.storage.set('pt_demo_mode', 'true');
  const result = await env.verification.verifyMedication('FAB-2026-049');
  env.storage.delete('pt_demo_mode');
  assert.equal(await env.verification.journalVerificationScan(result, 'public'), 'RECORDED');
  assert.equal(env.state.sdkCalls, 0);
  assert.equal(env.db.MOCK_SCANS[0].lot_id, result.lot.id);
});

test('a real result never changes to demo if the mode changes before journaling', async () => {
  const env = environment();
  env.state.lookup = { data: realLot, error: null };
  const result = await env.verification.verifyMedication(realLot.numero_lot);
  env.storage.set('pt_demo_mode', 'true');
  assert.equal(await env.verification.journalVerificationScan(result, 'public'), 'RECORDED');
  assert.equal(env.state.insertCalls, 1);
});

test('pharmacy transfer lookup rejection preserves the found lot', async () => {
  const env = environment();
  env.state.lookup = { data: realLot, error: null };
  env.state.session = { user: { id: 'fixture-pharmacy' } };
  env.state.pendingFailure = true;
  const ui = env.screen('pharmacie');
  await ui.submit(realLot.numero_lot);
  assert.match(ui.text(), /Lot de test réel/);
  assert.match(ui.text(), /recherche du transfert est indisponible/);
  assert.doesNotMatch(ui.text(), /Vérification indisponible|suspect/i);
});

test('the matching demo transfer can still be shown without a real backend', async () => {
  const env = environment();
  env.storage.set('pt_demo_mode', 'true');
  env.storage.set('pt_demo_role', 'pharmacie');
  const ui = env.screen('pharmacie');
  await ui.submit('CEF-2026-112');
  assert.match(ui.text(), /Ceftriaxone 1g/);
  assert.match(ui.text(), /Transfert en attente trouvé/);
  assert.match(ui.text(), /DÉMONSTRATION/);
  assert.equal(env.state.sdkCalls, 0);
});

test('LOT03: anonymous verification skips journaling without a failure banner', async () => {
  const env = environment();
  env.state.session = null;
  env.state.lookup = { data: realLot, error: null };
  const ui = env.screen('public');
  await ui.submit(realLot.numero_lot);
  assert.match(ui.text(), /Lot de test réel/);
  assert.doesNotMatch(ui.text(), /scan n’a pas pu être enregistré/);
  assert.equal(env.state.insertCalls, 0);
  assert.equal(env.state.rpcCalls.every(call => call.name === 'verify_public_lot'), true);
});

test('LOT03: normalized QR uses only the public RPC and retains no extra fields', async () => {
  const env = environment();
  env.state.lookup = { data: { ...realLot, id: 'PRIVATE_UUID', telephone: 'PRIVATE_PHONE', quantite_actuelle: 999 }, error: null };
  const result = await env.verification.verifyMedication('https://example.test/verify?hash=REAL-2026-001');
  assert.equal(result.status, 'FOUND');
  assert.equal(env.state.rpcCalls[0].name, 'verify_public_lot');
  assert.equal(env.state.rpcCalls[0].args.p_identifier, realLot.numero_lot);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE|quantite_actuelle/);
});

test('LOT03: missing RPC is unavailable with no raw table fallback', async () => {
  const env = environment();
  env.state.lookup = { data: null, error: new Error('Function not found before cutover') };
  assert.equal((await env.verification.verifyMedication(realLot.numero_lot)).status, 'UNAVAILABLE');
  assert.equal(env.state.lookupCalls, 1);
});

test('LOT03: multiple rows and unknown states cannot manufacture a match', async () => {
  const env = environment();
  for (const data of [[realLot, realLot], { ...realLot, etat: 'authentique' }]) {
    env.state.lookup = { data, error: null };
    assert.equal((await env.verification.verifyMedication(realLot.numero_lot)).status, 'UNAVAILABLE');
  }
});

test('LOT03: journal RPC receives no client verdict or scanner identity', async () => {
  const env = environment();
  env.state.lookup = { data: realLot, error: null };
  const found = await env.verification.verifyMedication(realLot.numero_lot);
  assert.equal(await env.verification.journalVerificationScan(found, 'pharmacie'), 'RECORDED');
  const call = env.state.rpcCalls.find(call => call.name === 'record_verification_scan');
  assert.deepEqual(Object.keys(call.args), ['p_identifier']);
  assert.equal(call.args.p_identifier, realLot.numero_lot);
});

for (const kind of ['public', 'pharmacie']) {
  test(`LOT03: ${kind} displays an archived match without a positive verdict`, async () => {
    const env = environment();
    env.state.lookup = { data: { ...realLot, etat: 'archive' }, error: null };
    env.state.journalFailure = 'return';
    const ui = env.screen(kind);
    await ui.submit(realLot.numero_lot);
    assert.match(ui.text(), /Lot archivé/);
    assert.match(ui.text(), /Lot de test réel/);
    assert.doesNotMatch(ui.text(), /authentique|suspect|EXPIRÉ|Lot Expiré/);
  });
}

test('LOT03: pharmacy gets the internal lot identity only from its authorized transfer', async () => {
  const env = environment();
  env.state.lookup = { data: realLot, error: null };
  env.state.pendingData = { id: 'business-transfer', lot_id: 'business-lot', quantite_transferee: 2, expediteur_id: { nom_entite: 'Partner' } };
  const found = await env.verification.verifyMedication(realLot.numero_lot);
  assert.equal('id' in found.lot, false);
  const transfer = await env.verification.findPendingVerificationTransfer(found);
  assert.equal(transfer.lotId, 'business-lot');
  assert.equal(transfer.id, 'business-transfer');
});

test('LOT03: mismatched expected transfer remains a secondary failure', async () => {
  const env = environment();
  env.state.lookup = { data: realLot, error: null };
  env.state.routeParams = { expectedLotId: 'expected', expectedLotNum: realLot.numero_lot };
  env.state.pendingData = { id: 'business-transfer', lot_id: 'other', quantite_transferee: 2, expediteur_id: { nom_entite: 'Partner' } };
  const ui = env.screen('pharmacie');
  await ui.submit(realLot.numero_lot);
  assert.match(ui.text(), /Lot de test réel/);
  assert.match(ui.text(), /recherche du transfert est indisponible/);
  assert.doesNotMatch(ui.text(), /Transfert en attente trouvé/);
});

test('LOT03: own contact profile uses only the UID-scoped RPC', async () => {
  const env = environment();
  env.state.workflowProfile = { id: 'self', telephone: 'own-contact' };
  assert.equal((await env.workflow.getOwnProfile()).telephone, 'own-contact');
  assert.equal(env.state.rpcCalls[0].name, 'get_my_profile');
  assert.equal(env.state.rpcCalls[0].args, undefined);
});

test('LOT03: real catalogue keeps only medicine fields', async () => {
  const env = environment();
  env.state.workflowCatalog = [{ nom_medicament: 'Medicine', dosage: null, forme_galenique: 'Comprime', quantite_actuelle: 999, id: 'PRIVATE' }];
  const data = await env.workflow.getManufacturerCatalog('maker');
  assert.equal(env.state.rpcCalls[0].name, 'get_manufacturer_catalog');
  assert.equal(env.state.rpcCalls[0].args.p_manufacturer_id, 'maker');
  assert.doesNotMatch(JSON.stringify(data), /PRIVATE|quantite_actuelle/);
  assert.equal(data[0].dosage, '');
});

test('LOT03: workflow RPC errors do not fall back to a broad table read', async () => {
  const env = environment();
  env.state.workflowError = new Error('Unavailable workflow RPC');
  await assert.rejects(env.workflow.getOwnProfile());
  await assert.rejects(env.workflow.getManufacturerCatalog('maker'));
});

test('LOT03: demo profile and catalogue stay entirely local', async () => {
  const env = environment();
  env.storage.set('pt_demo_mode', 'true');
  env.storage.set('pt_demo_role', 'fabricant');
  assert.equal((await env.workflow.getOwnProfile()).role, 'fabricant');
  assert.equal((await env.workflow.getManufacturerCatalog('unknown-maker')).length, 0);
  assert.ok((await env.workflow.getManufacturerCatalog('mock-user-id-fabricant')).length > 0);
  assert.equal(env.state.sdkCalls, 0);
});

test('LOT03A: directory uses an identity-free scoped RPC and drops private fields', async () => {
  const env = environment();
  env.state.workflowPartners = [{ id: 'partner', nom_entite: 'Entity', ville: 'City', pays: 'Niger', telephone: 'PRIVATE' }];
  const partners = await env.workflow.getBusinessPartners();
  assert.equal(env.state.rpcCalls[0].name, 'get_business_partners');
  assert.equal(env.state.rpcCalls[0].args, undefined);
  assert.equal(partners[0].id, 'partner');
  assert.doesNotMatch(JSON.stringify(partners), /PRIVATE|telephone/);
});

test('LOT03A: directory errors do not fall back to global profiles', async () => {
  const env = environment();
  env.state.workflowError = new Error('Directory unavailable');
  await assert.rejects(env.workflow.getBusinessPartners());
});

test('LOT03A: demo directory follows the selected role without a backend', async () => {
  const env = environment();
  env.storage.set('pt_demo_mode', 'true');
  env.storage.set('pt_demo_role', 'fabricant');
  assert.ok((await env.workflow.getBusinessPartners()).some(p => p.id === 'mock-user-id-pharmacie'));
  env.storage.set('pt_demo_role', 'pharmacie');
  assert.ok((await env.workflow.getBusinessPartners()).some(p => p.id === 'mock-user-id-fabricant'));
  env.storage.set('pt_demo_role', 'agent_dph');
  await assert.rejects(env.workflow.getBusinessPartners());
  assert.equal(env.state.sdkCalls, 0);
});

test('LOT03A: new business views preserve the explicit local demo', async () => {
  const env = environment();
  env.storage.set('pt_demo_mode', 'true');
  const lot = await env.db.supabase.from('business_lots').select('id').eq('id', 'mock-lot-1').single();
  const stats = await env.db.supabase.from('supervision_stats').select('*').single();
  assert.equal(lot.data.id, 'mock-lot-1');
  assert.equal(typeof stats.data.total_lots, 'number');
  assert.equal(env.state.sdkCalls, 0);
});
