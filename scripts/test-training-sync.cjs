const fs = require('node:fs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
const { TrainingSync, trainingKey } = require('../lib/training-sync.ts');
const { emptyData, parseTraining } = require('../lib/machine-training.ts');
const fresh = () => structuredClone(emptyData);
function memory() { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), values }; }
function store(storage, remote, key = 'account') { return new TrainingSync(key, storage, fresh, remote, () => {}); }

test('guest saves do not need a database connection and preserve the device data format', async () => {
  const storage = memory(), sync = store(storage, null, 'guest');
  await sync.start(); sync.update(d => ({ ...d, name: 'Guest' }));
  assert.equal(JSON.parse(storage.getItem('guest')).name, 'Guest');
  assert.equal(sync.snapshot.status, 'device'); sync.dispose();
});
test('account starts with its cloud data instead of guest data', async () => {
  const remote = { load: async () => ({ data: { ...fresh(), name: 'Cloud' }, revision: 4 }), save: async () => { throw new Error('Unexpected save'); } };
  const sync = store(memory(), remote); await sync.start();
  assert.equal(sync.snapshot.data.name, 'Cloud'); assert.equal(sync.snapshot.status, 'synced'); sync.dispose();
});
test('offline edits survive reload and upload when connection returns', async () => {
  const storage = memory(); let online = false, saves = 0;
  const remote = { load: async () => { if (!online) throw new Error('Offline'); return null; }, save: async (data, revision) => { saves++; assert.equal(data.name, 'Offline work'); assert.equal(revision, 0); return 1; } };
  const first = store(storage, remote); await first.start(); first.update(d => ({ ...d, name: 'Offline work' })); first.dispose();
  assert.equal(JSON.parse(storage.getItem('account')).dirty, true);
  online = true; const resumed = store(storage, remote); await resumed.start();
  assert.equal(saves, 1); assert.equal(JSON.parse(storage.getItem('account')).dirty, false); resumed.dispose();
});
test('edits made during a save are sent in a second serialized write', async () => {
  let release; const sent = [], storage = memory();
  const remote = { load: async () => null, save: async (data, revision) => { sent.push([data.name, revision]); if(sent.length === 1) await new Promise(resolve => release = resolve); return revision + 1; } };
  const sync = store(storage, remote); await sync.start(); sync.update(d => ({ ...d, name: 'First' }));
  const saving = sync.sync(); sync.update(d => ({ ...d, name: 'Second' })); release(); await saving;
  assert.deepEqual(sent, [['First', 0], ['Second', 1]]); assert.equal(JSON.parse(storage.getItem('account')).data.name, 'Second'); sync.dispose();
});
test('a stale revision preserves local changes and never overwrites the remote record', async () => {
  const storage = memory(); storage.setItem('account', JSON.stringify({ data: { ...fresh(), name: 'Local' }, revision: 2, dirty: true }));
  let saves = 0; const remote = { load: async () => ({ data: { ...fresh(), name: 'Other device' }, revision: 3 }), save: async () => ++saves };
  const sync = store(storage, remote); await sync.start();
  assert.equal(sync.snapshot.status, 'conflict'); assert.equal(sync.snapshot.data.name, 'Local'); assert.equal(saves, 0);
  await sync.loadAccountCopy(); assert.equal(sync.snapshot.data.name, 'Other device'); assert([...storage.values.keys()].some(key => key.includes(':backup:'))); sync.dispose();
});
test('database compare-and-save conflict leaves local copy dirty', async () => {
  const storage = memory(), sync = store(storage, { load: async () => null, save: async () => 0 });
  await sync.start(); sync.update(d => ({ ...d, name: 'Kept' })); await sync.sync();
  assert.equal(sync.snapshot.status, 'conflict'); assert.equal(JSON.parse(storage.getItem('account')).dirty, true); sync.dispose();
});
test('accounts have separate keys and invalid caches are preserved', async () => {
  assert.notEqual(trainingKey('alice'), trainingKey('bob')); assert.notEqual(trainingKey('alice'), trainingKey(null));
  const storage = memory(); storage.setItem('account', 'not-json');
  const sync = store(storage, { load: async () => null, save: async () => 1 }); await sync.start();
  assert.equal(sync.snapshot.canSave, false); assert.equal(storage.getItem('account'), 'not-json'); sync.dispose();
  assert.throws(() => parseTraining({ ...fresh(), history: [{ id: 'bad', started: 1, sets: {} }] }));
  assert.throws(() => parseTraining({ ...fresh(), favorites: [null] }));
});
test('disposed account cannot apply a late response to a different account UI', async () => {
  let release; const updates = [];
  const sync = new TrainingSync('old-user', memory(), fresh, { load: async () => new Promise(resolve => release = resolve), save: async () => 1 }, snapshot => updates.push(snapshot));
  const starting = sync.start(); sync.dispose(); release({ data: { ...fresh(), name: 'Old user' }, revision: 1 }); await starting;
  assert(!updates.some(snapshot => snapshot.data.name === 'Old user'));
});
