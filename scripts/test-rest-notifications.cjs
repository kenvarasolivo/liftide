const fs = require('node:fs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
const { RestNotifications } = require('../lib/rest-notifications.ts');
const flush = () => new Promise(resolve => setImmediate(resolve));
const running = (endAt) => ({ exerciseId: 'row', endAt, paused: null, complete: false });

function setup() {
  const messages = [];
  const notifications = new RestNotifications({
    async show(title, options) { messages.push({ title, options }); },
    async close() { messages.push({ close: true }); },
  });
  return { notifications, messages };
}

test('rest stays silent until the deadline and then shows one alert', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000 });
  const { notifications, messages } = setup();
  notifications.update(running(91000), 'Cable row');
  for (let second = 0; second < 89; second++) {
    t.mock.timers.tick(1000);
    await flush();
  }
  assert.equal(messages.filter(message => message.title).length, 0);
  t.mock.timers.tick(1000);
  await flush();
  const alerts = messages.filter(message => message.title);
  assert.equal(alerts.length, 1);
  assert.match(alerts[0].title, /Rest complete/);
  assert.notEqual(alerts[0].options.silent, true);
  notifications.dispose();
});

test('deadline alert is delivered once even when the UI also completes the rest', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000 });
  const { notifications, messages } = setup();
  notifications.update(running(3000), 'Cable row');
  await flush();
  assert.equal(messages.filter(message => message.title).length, 0);
  t.mock.timers.tick(2000);
  notifications.update({ ...running(null), complete: true }, 'Cable row');
  await flush();
  assert.equal(messages.length, 2);
  assert.match(messages[1].title, /Rest complete/);
  assert.equal(messages[1].options.silent, undefined);
  assert.equal(messages[1].options.renotify, true);
  notifications.dispose();
});

test('pause cancels the old deadline and resume uses the new deadline', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000 });
  const { notifications, messages } = setup();
  notifications.update(running(3000), 'Cable row');
  await flush();
  notifications.update({ ...running(null), paused: 2 }, 'Cable row');
  t.mock.timers.tick(5000);
  await flush();
  assert.equal(messages.length, 2);
  assert.equal(messages.filter(message => message.title).length, 0);
  notifications.update(running(8000), 'Cable row');
  t.mock.timers.tick(2000);
  await flush();
  assert.match(messages.at(-1).title, /Rest complete/);
  notifications.dispose();
});

test('adjustment and skipping cancel stale alerts', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000 });
  const { notifications, messages } = setup();
  notifications.update(running(3000), 'Cable row');
  notifications.update(running(5000), 'Cable row');
  t.mock.timers.tick(2000);
  await flush();
  assert.equal(messages.filter(message => message.title).length, 0);
  notifications.update({ ...running(null), complete: true }, 'Cable row');
  t.mock.timers.tick(5000);
  await flush();
  assert.deepEqual(messages.at(-1), { close: true });
  assert.equal(messages.some(message => message.title?.includes('Rest complete')), false);
  notifications.dispose();
});

test('a delayed UI tick still delivers completion; removing rest clears it', async t => {
  t.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: 1000 });
  const { notifications, messages } = setup();
  notifications.update(running(500), 'Cable row');
  await flush();
  assert.match(messages.find(message => message.title).title, /Rest complete/);
  notifications.update(null, '');
  await flush();
  assert.deepEqual(messages.at(-1), { close: true });
  notifications.dispose();
});

test('queued cancellation runs after an in-flight notification finishes', async () => {
  let release;
  const messages = [];
  const notifications = new RestNotifications({
    show: () => new Promise(resolve => { release = () => { messages.push('shown'); resolve(); }; }),
    async close() { messages.push('closed'); },
  });
  notifications.update(running(Date.now() - 1), 'Cable row');
  await flush();
  notifications.dispose();
  release();
  await flush();
  assert.deepEqual(messages, ['closed', 'shown', 'closed']);
});
