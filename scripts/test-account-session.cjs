const fs = require('node:fs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

function load(file, dependencies, globals = {}) {
  const source = ts.transpileModule(fs.readFileSync(require.resolve(file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const exports = {};
  new Function('require', 'exports', ...Object.keys(globals), source)(name => dependencies[name] ?? require(name), exports, ...Object.values(globals));
  return exports;
}

test('landing offers training and profile to a signed-in user, and login only to guests', () => {
  let auth = { user: { id: 'member' }, loading: false };
  const links = load('../components/landing-account-links.tsx', {
    '@/components/auth-provider': { useAuth: () => auth },
    'next/link': { __esModule: true, default: props => React.createElement('a', props) },
  });
  const render = () => renderToStaticMarkup(React.createElement(React.Fragment, null,
    React.createElement(links.LandingAccountLinks), React.createElement(links.LandingTrainingLink), React.createElement(links.LandingAccountLinks, { footer: true })));
  const signedIn = render();
  assert.match(signedIn, /href="\/account"/);
  assert.match(signedIn, /href="\/train"/);
  assert.doesNotMatch(signedIn, /href="\/(login|signup)"/);
  auth = { user: null, loading: false };
  assert.match(render(), /href="\/login"/);
  assert.match(render(), /href="\/signup"/);
  auth.loading = true;
  assert.doesNotMatch(render(), /href="\/(login|signup)"/);
});

test('connection failures preserve remembered identity; a verified ended session clears it', async () => {
  const user = { id: 'member', email: 'member@example.test', name: 'Member' };
  const storage = new Map([['liftide:neon-user', JSON.stringify(user)]]);
  let state, refresh, connected = false, sessionUser = user;
  const provider = load('../components/auth-provider.tsx', {
    react: { ...React, useState: initial => { state = initial; return [state, update => { state = typeof update === 'function' ? update(state) : update; }]; }, useCallback: fn => { refresh = fn; return fn; }, useEffect: () => {} },
    '@/lib/auth-client': { authClient: { getSession: async () => ({ data: { user: sessionUser } }) } },
  }, {
    navigator: { onLine: true },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
    fetch: async () => { if (!connected) throw new Error('Network unavailable'); return { ok: true, json: async () => ({ configured: true }) }; },
  });
  provider.AuthProvider({ children: null });
  await refresh();
  assert.equal(state.user.id, user.id);
  assert.equal(state.loading, false);
  connected = true;
  await refresh();
  assert.equal(state.user.id, user.id);
  assert.equal(state.error, '');
  connected = false;
  await refresh();
  assert.equal(state.user.id, user.id);
  connected = true;
  sessionUser = null;
  await refresh();
  assert.equal(state.user, null);
  assert.equal(storage.has('liftide:neon-user'), false);
});
