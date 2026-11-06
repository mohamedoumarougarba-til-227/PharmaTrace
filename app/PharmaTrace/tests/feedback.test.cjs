const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the real component without a browser, Auth, storage or backend.
function setup(openURL) {
  const hooks = [];
  let cursor = 0;
  const jsx = (type, props) => ({ type, props });
  const mocks = {
    react: { useState(initial) {
      const i = cursor++;
      if (!(i in hooks)) hooks[i] = initial;
      return [hooks[i], value => { hooks[i] = value; }];
    } },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', Linking: { openURL }, Platform: { OS: 'web' } },
  };
  const file = path.join(__dirname, '../components/FeedbackBar.tsx');
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    fileName: file,
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext('(function(require,module,exports){' + source + '\n})', {}, { filename: file })(name => {
    assert.ok(name in mocks, 'Unexpected import: ' + name);
    return mocks[name];
  }, module, module.exports);
  function render() { cursor = 0; return module.exports.default(); }
  function nodes(node) {
    if (!node || typeof node !== 'object') return [];
    if (Array.isArray(node)) return node.flatMap(nodes);
    return [node, ...nodes(node.props?.children)];
  }
  return {
    link() { return nodes(render()).find(node => node.props?.accessibilityRole === 'link'); },
    error() { return nodes(render()).find(node => node.props?.accessibilityLiveRegion === 'polite'); },
  };
}

test('feedback opens only on voluntary activation, with the exact fixed URL and no extra data', async () => {
  const calls = [];
  const env = setup(async (...args) => { calls.push(args); });
  const link = env.link();
  assert.match(link.props.accessibilityLabel, /formulaire externe Tally/);
  assert.equal(calls.length, 0);
  await link.props.onPress({ nativeEvent: { token: 'synthetic-do-not-forward', qr: 'synthetic-qr' } });
  assert.deepEqual(calls, [['https://tally.so/r/aOeY72']]);
  assert.equal(env.error(), undefined);
});

test('web keyboard Enter opens once, prevents default and exposes a visible focus indicator', async () => {
  const calls = [];
  const env = setup(async (...args) => { calls.push(args); });
  let prevented = false;
  env.link().props.onFocus();
  assert.equal(env.link().props.style.borderColor, '#153E63');
  env.link().props.onKeyDown({ key: 'Enter', preventDefault() { prevented = true; } });
  await Promise.resolve();
  assert.equal(prevented, true);
  assert.deepEqual(calls, [['https://tally.so/r/aOeY72']]);
  env.link().props.onBlur();
  assert.equal(env.link().props.style.borderColor, 'transparent');
});

for (const failure of ['rejected promise', 'synchronous exception']) {
  test(`feedback handles ${failure} without navigation changes and allows retry`, async () => {
    let fail = true;
    const calls = [];
    const env = setup((...args) => {
      calls.push(args);
      if (!fail) return Promise.resolve();
      if (failure === 'synchronous exception') throw new Error('synthetic browser failure');
      return Promise.reject(new Error('synthetic browser failure'));
    });
    await env.link().props.onPress();
    assert.match(env.error().props.children, /Impossible d’ouvrir le formulaire/);
    assert.ok(env.link(), 'Link remains available after the error');
    fail = false;
    await env.link().props.onPress();
    assert.equal(env.error(), undefined);
    assert.deepEqual(calls, [['https://tally.so/r/aOeY72'], ['https://tally.so/r/aOeY72']]);
  });
}
