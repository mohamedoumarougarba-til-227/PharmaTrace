const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function setup() {
  const storage = new Map();
  const state = { session: { user: { id: 'LOT02_TEST_USER' } }, role: null, sessionError: null, roleError: null, signInError: null, signInThrows: false, rpcCalls: 0, sdkCalls: 0, routes: [] };
  const client = {
    auth: {
      async getSession() { return { data: { session: state.session }, error: state.sessionError }; },
      async signInWithPassword() {
        if (state.signInThrows) throw new Error('LOT02_TEST_NETWORK');
        return { data: { user: state.session?.user }, error: state.signInError };
      },
    },
    async rpc(name) {
      assert.equal(name, 'get_my_role');
      state.rpcCalls++;
      return { data: state.role, error: state.roleError };
    },
    from() { throw new Error('Client profile.role must not be used as authority'); },
  };
  const hooks = [];
  let cursor = 0;
  const react = {
    useState(initial) {
      const i = cursor++;
      if (!(i in hooks)) hooks[i] = initial;
      return [hooks[i], value => { hooks[i] = value; }];
    },
    useEffect() {},
  };
  const jsx = (type, props) => ({ type, props });
  const native = Object.fromEntries(['View', 'Text', 'TextInput', 'TouchableOpacity', 'KeyboardAvoidingView', 'ScrollView', 'Image'].map(name => [name, name]));
  native.Platform = { OS: 'web' };
  native.Alert = { alert() {} };
  native.useWindowDimensions = () => ({ width: 390 });
  const mocks = {
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-native': native,
    '@react-native-async-storage/async-storage': {
      async getItem(key) { return storage.get(key) ?? null; },
      async setItem(key, value) { storage.set(key, value); },
    },
    'expo-router': { router: { replace(route) { state.routes.push(route); } } },
    'expo-status-bar': { StatusBar: 'StatusBar' },
  };
  const cache = new Map();
  const root = path.resolve(__dirname, '..');
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
      fileName: file,
    }).outputText;
    function requireStub(name) {
      if (name in mocks) return mocks[name];
      if (/\.(png|jpe?g)$/.test(name)) return 1;
      if (name.endsWith('/supabase')) return { supabase: client, getSupabase() { state.sdkCalls++; return client; } };
      if (name.endsWith('/constants/icons')) return { FAIcon: 'FAIcon' };
      if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name + '.ts'));
      throw new Error('Unmocked import forbidden: ' + name);
    }
    vm.runInNewContext('(function(require,module,exports){' + js + '\n})', {}, { filename: file })(requireStub, module, module.exports);
    return module.exports;
  }
  const roles = load(path.join(root, 'lib/businessRole.ts'));
  function login() {
    const Login = load(path.join(root, 'app/(auth)/login.tsx')).default;
    function render() { cursor = 0; return Login(); }
    function nodes(node) {
      if (node == null || typeof node === 'boolean') return [];
      if (Array.isArray(node)) return node.flatMap(nodes);
      if (typeof node !== 'object') return [node];
      return [node, ...nodes(node.props?.children)];
    }
    return {
      async submit() {
        const inputs = nodes(render()).filter(node => node.type === 'TextInput');
        inputs[0].props.onChangeText('lot02_test_user@example.invalid');
        inputs[1].props.onChangeText('LOT02_TEST_PASSWORD');
        const button = nodes(render()).find(node => node.type === 'TouchableOpacity'
          && nodes(node.props.children).includes('Se connecter'));
        await button.props.onPress();
      },
      text() { return nodes(render()).filter(node => typeof node === 'string').join(' '); },
    };
  }
  return { state, storage, roles, login };
}

test('authenticated account with no effective role is UNPROVISIONED', async () => {
  const env = setup();
  assert.equal((await env.roles.getBusinessAccess()).status, 'UNPROVISIONED');
  assert.equal(env.state.rpcCalls, 1);
});

test('anonymous session does not query the role RPC', async () => {
  const env = setup();
  env.state.session = null;
  assert.equal((await env.roles.getBusinessAccess()).status, 'ANONYMOUS');
  assert.equal(env.state.rpcCalls, 0);
});

for (const role of ['fabricant', 'pharmacie', 'agent_dph']) {
  test('DB effective role authorizes ' + role, async () => {
    const env = setup();
    env.state.role = role;
    const access = await env.roles.getBusinessAccess();
    assert.equal(access.status, 'AUTHORIZED');
    assert.equal(access.role, role);
  });
}

test('session or role lookup errors never grant a business role', async () => {
  for (const key of ['sessionError', 'roleError']) {
    const env = setup();
    env.state[key] = new Error('LOT02_TEST_ERROR');
    assert.equal((await env.roles.getBusinessAccess()).status, 'UNAVAILABLE');
  }
});

test('an unexpected role response is unavailable, not a default manufacturer', async () => {
  const env = setup();
  env.state.role = 'admin';
  assert.equal((await env.roles.getBusinessAccess()).status, 'UNAVAILABLE');
});

test('demo roles remain local and missing demo role has no implicit privilege', async () => {
  const env = setup();
  env.storage.set('pt_demo_mode', 'true');
  assert.equal((await env.roles.getBusinessAccess()).status, 'UNPROVISIONED');
  env.storage.set('pt_demo_role', 'pharmacie');
  assert.equal((await env.roles.getBusinessAccess()).role, 'pharmacie');
  assert.equal(env.state.sdkCalls, 0);
});

test('login shows the unprovisioned message and does not navigate to a business screen', async () => {
  const env = setup();
  const screen = env.login();
  await screen.submit();
  assert.match(screen.text(), /aucun accès métier n’a été validé/);
  assert.match(screen.text(), /Se connecter/);
  assert.equal(env.state.routes.length, 0);
});

test('login navigates only using the effective DB role', async () => {
  const env = setup();
  env.state.role = 'fabricant';
  await env.login().submit();
  assert.deepEqual(env.state.routes, ['/(fabricant)']);
});

test('login network rejection clears loading and displays an unavailable message', async () => {
  const env = setup();
  env.state.signInThrows = true;
  const screen = env.login();
  await screen.submit();
  assert.match(screen.text(), /Connexion indisponible/);
  assert.match(screen.text(), /Se connecter/);
  assert.equal(env.state.routes.length, 0);
});
