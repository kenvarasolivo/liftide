const fs = require('node:fs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
const { automaticUpdates } = require('../lib/pwa-updates.ts');

function setup({ controlled = true, waiting = true, idle = true } = {}) {
  const worker = Object.assign(new EventTarget(), { messages: [], postMessage(message) { this.messages.push(message); } });
  const registration = Object.assign(new EventTarget(), { waiting: waiting ? worker : null, installing: null });
  const container = Object.assign(new EventTarget(), { controller: controlled ? {} : null });
  const state = { idle, reloads: 0 };
  const updates = automaticUpdates(registration, container, () => state.idle, () => state.reloads++);
  return { worker, registration, container, state, updates };
}

test('an already waiting update activates automatically and reloads only once', () => {
  const { worker, container, state, updates } = setup();
  assert.deepEqual(worker.messages, [{ type: 'SKIP_WAITING' }]);
  updates.check();
  assert.equal(worker.messages.length, 1);
  container.dispatchEvent(new Event('controllerchange'));
  updates.check();
  assert.equal(state.reloads, 1);
  updates.dispose();
});

test('editing or pending training blocks activation and reload until idle', () => {
  const { worker, container, state, updates } = setup({ idle: false });
  assert.equal(worker.messages.length, 0);
  state.idle = true;
  updates.check();
  assert.equal(worker.messages.length, 1);
  state.idle = false;
  container.dispatchEvent(new Event('controllerchange'));
  assert.equal(state.reloads, 0);
  state.idle = true;
  updates.check();
  assert.equal(state.reloads, 1);
  updates.dispose();
});

test('an update installed after launch activates without a prompt', () => {
  const { worker, registration, state, updates, container } = setup({ waiting: false });
  registration.installing = worker;
  registration.dispatchEvent(new Event('updatefound'));
  assert.equal(worker.messages.length, 0);
  registration.waiting = worker;
  worker.dispatchEvent(new Event('statechange'));
  assert.equal(worker.messages.length, 1);
  container.dispatchEvent(new Event('controllerchange'));
  assert.equal(state.reloads, 1);
  updates.dispose();
});

test('first installation does not reload and disposal removes lifecycle listeners', () => {
  const { container, registration, state, worker, updates } = setup({ controlled: false, waiting: false });
  container.dispatchEvent(new Event('controllerchange'));
  assert.equal(state.reloads, 0);
  updates.dispose();
  registration.installing = worker;
  registration.waiting = worker;
  registration.dispatchEvent(new Event('updatefound'));
  worker.dispatchEvent(new Event('statechange'));
  container.dispatchEvent(new Event('controllerchange'));
  assert.equal(worker.messages.length, 0);
  assert.equal(state.reloads, 0);
});
