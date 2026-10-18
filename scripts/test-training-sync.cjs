const fs = require('node:fs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
const { TrainingSync, trainingKey } = require('../lib/training-sync.ts');
const { emptyData, parseTraining } = require('../lib/machine-training.ts');
const { exercises } = require('../lib/training.ts');
const { category } = require('../lib/machine-training.ts');
const fresh = () => structuredClone(emptyData);

test('set corrections preserve timestamps and session status, and reject stale or invalid edits', () => {
  const { correctTrainingSet } = require('../lib/training-sessions.ts');
  const original = [{ weight: 20, reps: 10, done: false }, { weight: 40, reps: 8, done: true, loggedAt: 125 }];
  const session = { id: 'finished', routine: 'Push', started: 100, finished: 200, sets: { incline: original } };
  const data = { ...fresh(), history: [session] };
  const edited = correctTrainingSet(data, session.id, 'incline', 1, original, { weight: 35.5, reps: 10 });
  assert.deepEqual(edited.history[0].sets.incline[1], { weight: 35.5, reps: 10, done: true, loggedAt: 125 });
  assert.equal(edited.history[0].finished, 200);
  assert.equal(data.history[0].sets.incline[1].weight, 40);
  assert.equal(correctTrainingSet(edited, session.id, 'incline', 1, original, null), edited);
  assert.equal(correctTrainingSet(data, session.id, 'incline', 1, original, { weight: -5, reps: 10 }), data);
  assert.equal(correctTrainingSet(data, session.id, 'incline', 1, original, { weight: 5, reps: 1.5 }), data);
  const deleted = correctTrainingSet(data, session.id, 'incline', 1, original, null);
  assert.deepEqual(deleted.history[0].sets.incline, [original[0]]);
  assert.equal(correctTrainingSet(deleted, session.id, 'incline', 1, original, null), deleted);
});

test('deleting a session clears its active rest and preserves unrelated workouts', () => {
  const { deleteTrainingSession, correctTrainingSet } = require('../lib/training-sessions.ts');
  const original = [{ weight: 40, reps: 8, done: true, loggedAt: 125 }];
  const current = { id: 'active', routine: 'Push', started: 100, sets: { incline: original } };
  const other = { ...current, id: 'other', finished: 200 };
  const rest = { exerciseId: 'incline', endAt: 500, paused: null, duration: 120, complete: false };
  const data = { ...fresh(), current, rest, history: [other] };
  const removedSet = correctTrainingSet(data, current.id, 'incline', 0, original, null);
  assert.equal(removedSet.rest, null);
  assert.deepEqual(removedSet.current.sets.incline, []);
  const removedHistory = deleteTrainingSession(data, other.id);
  assert.deepEqual(removedHistory.history, []);
  assert.equal(removedHistory.current, current);
  assert.equal(removedHistory.rest, rest);
  const removedActive = deleteTrainingSession(data, current.id);
  assert.equal(removedActive.current, null);
  assert.equal(removedActive.rest, null);
  assert.deepEqual(removedActive.history, [other]);
});

test('corrections survive database reload and concurrent deletion cannot shift the edit target', async () => {
  const { correctTrainingSet, deleteTrainingSession } = require('../lib/training-sessions.ts');
  const original = [{ weight: 40, reps: 8, done: true, loggedAt: 125 }, { weight: 50, reps: 6, done: true, loggedAt: 130 }];
  let row = { data: { ...fresh(), history: [{ id: 'saved', routine: 'Push', started: 100, finished: 200, sets: { incline: original } }] }, revision: 1 };
  let conflict = false;
  const remote = { load: async () => structuredClone(row), save: async (data, revision) => {
    if(conflict) { conflict = false; row.data.history[0].sets.incline.shift(); row.revision++; return 0; }
    assert.equal(revision, row.revision); row = { data: structuredClone(data), revision: revision + 1 }; return row.revision;
  } };
  const sync = store(memory(), remote); await sync.start();
  await sync.update(data => correctTrainingSet(data, 'saved', 'incline', 1, original, { weight: 45, reps: 7 }));
  const edited = structuredClone(row.data.history[0].sets.incline);
  conflict = true;
  await sync.update(data => correctTrainingSet(data, 'saved', 'incline', 1, edited, { weight: 60, reps: 5 }));
  assert.deepEqual(row.data.history[0].sets.incline, [edited[1]]);
  sync.dispose();
  const reopened = store(memory(), remote); await reopened.start();
  assert.deepEqual(reopened.snapshot.data.history[0].sets.incline, [edited[1]]);
  await reopened.update(data => deleteTrainingSession(data, 'saved'));
  await reopened.sync();
  assert.deepEqual(row.data.history, []); reopened.dispose();
});
function memory() { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), values }; }
function store(storage, remote, key = 'account') { return new TrainingSync(remote, () => {}); }

test('guests cannot save training, favorites or equipment edits', async () => {
  const storage = memory(), sync = store(storage, null, trainingKey(null));
  await sync.start();
  const session = { id: 'guest-session', routine: 'Back day', started: 123, sets: { 'reverse-fly': [{ weight: 25, reps: 12, done: true }] } };
  sync.update(d => ({ ...d, current: session, history: [session], favorites: ['reverse-fly'], setups: { 'reverse-fly': 'Seat 4' }, labels: { 'reverse-fly': 'My gym' }, restPreferences: { 'reverse-fly': 60 }, muscleTargets: { 'reverse-fly': { muscles: ['Upper back'], secondary: [] } }, customMachines: [{ ...exercises[0], id: 'custom', photoId: 'incline' }], name: 'Guest' }));
  await sync.sync();
  assert.deepEqual(sync.snapshot.data, fresh());
  assert.equal(sync.snapshot.canSave, false);
  assert.equal(sync.snapshot.status, 'preview');
  assert.equal(storage.values.size, 0);
  sync.dispose();
});

test('guest equipment selection and inputs are transient preview state', async () => {
  const storage = memory(), sync = store(storage, null, 'guest'); await sync.start();
  sync.update(d => ({ ...d, selectedId: 'reverse-fly', drafts: { 'reverse-fly': { weight: '25', reps: '12' } } }));
  assert.equal(sync.snapshot.data.selectedId, 'reverse-fly');
  assert.equal(sync.snapshot.data.drafts['reverse-fly'].weight, '25');
  assert.equal(storage.values.size, 0);
  sync.dispose();
  const reopened = store(storage, null, 'guest'); await reopened.start();
  assert.deepEqual(reopened.snapshot.data, fresh()); reopened.dispose();
});

test('preview never reads or overwrites existing guest or account storage', async () => {
  const storage = memory(); storage.setItem(trainingKey(null), 'legacy guest record');
  storage.setItem(trainingKey('alice'), 'private account cache');
  const before = new Map(storage.values);
  const sync = store(storage, null, trainingKey(null)); await sync.start(); await sync.sync();
  assert.equal(sync.snapshot.status, 'preview');
  assert.deepEqual(storage.values, before);
  assert.deepEqual(sync.snapshot.data.history, []); sync.dispose();
});

test('preview works when browser storage is unavailable', async () => {
  const storage = { getItem: () => { throw new Error('Unexpected read'); }, setItem: () => { throw new Error('Unexpected write'); } };
  const sync = store(storage, null, 'guest'); await sync.start();
  sync.update(d => ({ ...d, selectedId: 'incline' })); await sync.sync();
  assert.equal(sync.snapshot.status, 'preview'); assert.equal(sync.snapshot.data.selectedId, 'incline'); sync.dispose();
});

test('guest photos cannot be saved and do not open device storage', async () => {
  const { storePhoto, loadPhotos } = require('../lib/photos.ts');
  assert.deepEqual(await loadPhotos(), {});
  await assert.rejects(storePhoto('incline', 'data:image/png;base64,example'), /Log in/);
  await assert.rejects(storePhoto('incline', null), /Log in/);
});

test('reverse pec deck fly is discoverable as back equipment with a stable log ID', () => {
  const exercise = exercises.find(e => e.id === 'reverse-fly');
  assert.equal(exercise.name, 'Reverse pec deck fly');
  assert.equal(category(exercise), 'Back');
  assert(exercise.muscles.includes('Shoulders'));
});
test('account starts with its cloud data instead of guest data', async () => {
  const remote = { load: async () => ({ data: { ...fresh(), name: 'Cloud' }, revision: 4 }), save: async () => { throw new Error('Unexpected save'); } };
  const sync = store(memory(), remote); await sync.start();
  assert.equal(sync.snapshot.data.name, 'Cloud'); assert.equal(sync.snapshot.status, 'synced'); sync.dispose();
});
test('offline startup blocks training writes and never creates a device record', async () => {
  const storage = memory();
  const sync = store(storage, { load: async () => { throw new Error('Offline'); }, save: async () => { throw new Error('Unexpected write'); } });
  await sync.start();
  assert.equal(sync.snapshot.canSave, false);
  assert.equal(await sync.update(d => ({ ...d, name: 'Not accepted' })), false);
  assert.equal(sync.snapshot.data.name, '');
  assert.equal(storage.values.size, 0);
  sync.dispose();
});

test('writes start automatically and edits during a write are serialized', async () => {
  let release; const sent = [], storage = memory(); let row = null;
  const remote = { load: async () => row, save: async (data, revision) => { sent.push([data.name, revision]); if(sent.length === 1) await new Promise(resolve => release = resolve); row = {data, revision: revision + 1}; return revision + 1; } };
  const sync = store(storage, remote); await sync.start();
  const first = sync.update(d => ({ ...d, name: 'First' }));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(sent.length, 1); assert.equal(sync.snapshot.status, 'syncing');
  const second = sync.update(d => ({ ...d, name: 'Second' }));
  release(); assert.equal(await first, true); assert.equal(await second, true); await sync.sync();
  assert.deepEqual(sent, [['First', 0], ['Second', 1]]);
  assert.equal(sync.snapshot.status, 'synced'); assert.equal(storage.values.size, 0); sync.dispose();
});

test('a concurrent database write rebases the intended change without overwriting another device', async () => {
  let row = { data: {...fresh(), name: 'Original'}, revision: 1 }, attempts = 0;
  const remote = { load: async () => structuredClone(row), save: async (data, revision) => {
    if (++attempts === 1) { row = {data:{...row.data, setups:{lat:'Seat 5'}},revision:2}; return 0; }
    assert.equal(revision, 2); row = {data,revision:3}; return 3;
  }};
  const sync = store(memory(), remote); await sync.start();
  assert.equal(await sync.update(d => ({...d,name:'New name'})), true); await sync.sync();
  assert.equal(row.data.name, 'New name'); assert.deepEqual(row.data.setups, {lat:'Seat 5'});
  assert.equal(sync.snapshot.status, 'synced'); sync.dispose();
});

test('uncertain database acknowledgement does not duplicate a set or replay a toggle twice', async () => {
  let row = null, lost = true;
  const remote = { load: async () => structuredClone(row), save: async (data, revision) => {
    row = {data,revision:revision+1}; if(lost){lost=false;throw new Error('Response lost');} return row.revision;
  }};
  const sync = store(memory(), remote); await sync.start();
  const saved = await sync.update(d => ({...d,favorites:d.favorites.includes('lat')?[]:['lat'],current:{id:'open',routine:'Pull day',started:1,sets:{lat:[{weight:40,reps:10,done:true}]}}}));
  assert.equal(saved, false); assert.equal(sync.snapshot.status, 'offline'); assert.equal(sync.snapshot.pending, true); assert.equal(sync.snapshot.canSave, false);
  await sync.sync();
  assert.deepEqual(sync.snapshot.data.favorites, ['lat']); assert.equal(sync.snapshot.data.current.sets.lat.length, 1);
  assert.equal(sync.snapshot.pending, false); assert.equal(sync.snapshot.status, 'synced'); sync.dispose();
});

test('unconfirmed changes retry automatically from memory and are never reported as saved', async () => {
  let online = false, row = null;
  const storage = memory(), remote = {load:async()=>row,save:async(data,revision)=>{if(!online)throw new Error('Offline'); row={data,revision:revision+1}; return row.revision;}};
  const sync = store(storage, remote); await sync.start();
  assert.equal(await sync.update(d=>({...d,name:'Retry me'})), false);
  assert.equal(sync.snapshot.status, 'offline'); assert.match(sync.snapshot.message, /Not saved/); assert.equal(storage.values.size, 0);
  online=true; await sync.sync(); assert.equal(row.data.name,'Retry me'); assert.equal(sync.snapshot.pending,false); assert.equal(sync.snapshot.status,'synced'); sync.dispose();
});

test('idle refresh adopts database changes; selection and drafts never write training records', async () => {
  let saves=0,row={data:{...fresh(),name:'First device'},revision:1};
  const sync=store(memory(),{load:async()=>row,save:async()=>++saves}); await sync.start();
  await sync.update(d=>({...d,selectedId:'lat',drafts:{lat:{weight:'40',reps:'10'}}}));
  assert.equal(saves,0); row={data:{...fresh(),name:'Other device'},revision:2}; await sync.sync();
  assert.equal(sync.snapshot.data.name,'Other device'); assert.equal(sync.snapshot.data.selectedId,'lat'); assert.equal(sync.snapshot.data.drafts.lat.weight,'40'); sync.dispose();
});

test('repeated concurrent writes are bounded and retryable without a device-copy choice', async () => {
  let attempts=0;
  const sync=store(memory(),{load:async()=>null,save:async()=>{attempts++;return 0;}}); await sync.start();
  assert.equal(await sync.update(d=>({...d,name:'Pending'})),false);
  assert.equal(attempts,5); assert.equal(sync.snapshot.pending,true); assert.equal(sync.snapshot.canSave,false); assert.equal(sync.snapshot.status,'offline'); sync.dispose();
});

test('invalid old caches cannot block the database and training receipts are validated', async () => {
  const storage=memory(); storage.setItem('account','not-json');
  const sync=store(storage,{load:async()=>({data:{...fresh(),name:'Database'},revision:3}),save:async()=>{throw new Error('Unexpected save');}}); await sync.start();
  assert.equal(sync.snapshot.canSave,true); assert.equal(sync.snapshot.data.name,'Database'); assert.equal(storage.getItem('account'),'not-json'); sync.dispose();
  assert.notEqual(trainingKey('alice'),trainingKey('bob'));
  assert.throws(()=>parseTraining({...fresh(),appliedChanges:[null]}));
  assert.throws(()=>parseTraining({...fresh(),appliedChanges:Array(257).fill('x')}));
});

test('disposed account cannot apply a late response to a different account UI', async () => {
  let release; const updates = [];
  const sync = new TrainingSync({ load: async () => new Promise(resolve => release = resolve), save: async () => 1 }, snapshot => updates.push(snapshot));
  const starting = sync.start(); await Promise.resolve(); sync.dispose(); release({ data: { ...fresh(), name: 'Old user' }, revision: 1 }); await starting;
  assert(!updates.some(snapshot => snapshot.data.name === 'Old user'));
});

test('open sessions are in History before finishing, and finishing preserves their name and sets', () => {
  const {trainingSessions,recordTrainingSet,finishTrainingSession}=require('../lib/training-sessions.ts');
  const session={id:'open',routine:'Push day',started:1,sets:{}};
  const logged=recordTrainingSet(fresh(),session,'incline',{weight:45,reps:10,done:true,loggedAt:2},{exerciseId:'incline',endAt:1000,paused:null,duration:120,complete:false});
  assert.equal(trainingSessions(logged).length,1); assert.equal(trainingSessions(logged)[0].finished,undefined);
  const finished=finishTrainingSession(logged,'open',100);
  assert.equal(finished.current,null); assert.equal(trainingSessions(finished).length,1); assert.equal(finished.history[0].routine,'Push day'); assert.equal(finished.history[0].finished,100); assert.equal(finished.history[0].sets.incline.length,1);
});

test('resuming another open session preserves both workouts and a concurrent finish does not lose a set', () => {
  const {trainingSessions,recordTrainingSet,resumeTrainingSession}=require('../lib/training-sessions.ts');
  const a={id:'a',routine:'A',started:1,sets:{lat:[{weight:40,reps:10,done:true}]}},b={id:'b',routine:'B',started:2,sets:{}};
  const data={...fresh(),current:a,history:[b]};
  const resumed=resumeTrainingSession(data,'b'); assert.equal(resumed.current.id,'b'); assert.equal(trainingSessions(resumed).length,2);
  const concurrent={...fresh(),history:[{...a,finished:3}]};
  const result=recordTrainingSet(concurrent,a,'lat',{weight:45,reps:8,done:true},null);
  assert.equal(result.history[0].finished,3); assert.equal(result.history[0].sets.lat.length,2); assert.equal(result.current,null);
});

test('legacy recovery preserves database settings, merges equal sets by count, and does not reimport deleted sets', () => {
  const {recoverLegacySessions,trainingSessions}=require('../lib/training-sessions.ts');
  const a={id:'a',routine:'Database name',started:1,finished:10,sets:{lat:[{done:true,reps:10,weight:40}]}};
  const old={...a,routine:'Old name',finished:undefined,sets:{lat:[{weight:40,reps:10,done:true},{weight:40,reps:10,done:true}]}};
  const data={...fresh(),history:[a],name:'Database'};
  const legacy={...fresh(),current:old,name:'Old cache'};
  const recovered=recoverLegacySessions(data,legacy,'recovery-1');
  assert.equal(recovered.name,'Database');assert.equal(recovered.current,null);assert.equal(recovered.history[0].finished,10);assert.equal(recovered.history[0].routine,'Database name');assert.equal(recovered.history[0].sets.lat.length,2);
  const edited={...recovered,history:[{...recovered.history[0],sets:{lat:[]}}]};
  assert.equal(recoverLegacySessions(edited,legacy,'recovery-1'),edited);
  const freshAccount=recoverLegacySessions(fresh(),legacy,'recovery-2');
  assert.equal(trainingSessions(freshAccount).length,1);assert.equal(freshAccount.current.id,'a');assert.equal(freshAccount.current.finished,undefined);
});

test('two devices logging at once keep both sets in the same database session', async () => {
  const {recordTrainingSet}=require('../lib/training-sessions.ts');
  const session={id:'shared',routine:'Pull day',started:1,sets:{}};
  let row={data:{...fresh(),current:session},revision:1};
  const remote={load:async()=>structuredClone(row),save:async(data,revision)=>{if(revision!==row.revision)return 0;row={data:structuredClone(data),revision:revision+1};return row.revision;}};
  const a=store(memory(),remote),b=store(memory(),remote);await Promise.all([a.start(),b.start()]);
  const results=await Promise.all([a.update(d=>recordTrainingSet(d,session,'lat',{weight:40,reps:10,done:true,loggedAt:2},null)),b.update(d=>recordTrainingSet(d,session,'lat',{weight:45,reps:8,done:true,loggedAt:3},null))]);
  assert.deepEqual(results,[true,true]);assert.equal(row.data.current.sets.lat.length,2);assert.deepEqual(row.data.current.sets.lat.map(set=>set.weight).sort(),[40,45]);a.dispose();b.dispose();
});

test('a database-backed open session survives reload, can be named, and then finished', async () => {
  const {recordTrainingSet,trainingSessions,updateTrainingSession,finishTrainingSession}=require('../lib/training-sessions.ts');
  let row=null;
  const remote={load:async()=>structuredClone(row),save:async(data,revision)=>{row={data:structuredClone(data),revision:revision+1};return row.revision;}};
  const session={id:'persisted',routine:'Free training',started:1,sets:{}};
  const first=store(memory(),remote);await first.start();assert.equal(await first.update(d=>recordTrainingSet(d,session,'lat',{weight:40,reps:10,done:true},null)),true);first.dispose();
  const second=store(memory(),remote);await second.start();
  assert.equal(trainingSessions(second.snapshot.data)[0].finished,undefined);assert.equal(trainingSessions(second.snapshot.data)[0].sets.lat.length,1);
  await second.update(d=>updateTrainingSession(d,'persisted',s=>({...s,routine:'Pull day'})));
  assert.equal(await second.update(d=>finishTrainingSession(d,'persisted',100)),true);second.dispose();
  const third=store(memory(),remote);await third.start();assert.equal(third.snapshot.data.current,null);assert.equal(third.snapshot.data.history[0].routine,'Pull day');assert.equal(third.snapshot.data.history[0].finished,100);third.dispose();
});

test('large edit bursts are acknowledged in bounded batches without replaying earlier changes', async () => {
  let row=null,writes=0;
  const remote={load:async()=>row,save:async(data,revision)=>{writes++;row={data,revision:revision+1};return row.revision;}};
  const sync=store(memory(),remote);await sync.start();
  const edits=Array.from({length:270},()=>sync.update(d=>({...d,name:String(Number(d.name||0)+1)})));
  assert((await Promise.all(edits)).every(Boolean));
  assert.equal(row.data.name,'270');assert.equal(writes,3);assert.equal(sync.snapshot.pending,false);sync.dispose();
});

test('a no-op matching an unconfirmed change still waits for database acknowledgement', async () => {
  let release;
  const sync=store(memory(),{load:async()=>null,save:async()=>{await new Promise(resolve=>release=resolve);throw new Error('Offline');}});await sync.start();
  const first=sync.update(d=>({...d,name:'Pending'}));await new Promise(resolve=>setImmediate(resolve));
  let resolved=false;const repeated=sync.update(d=>({...d,name:'Pending'})).then(saved=>{resolved=true;return saved;});
  await Promise.resolve();assert.equal(resolved,false);release();assert.equal(await first,false);assert.equal(await repeated,false);sync.dispose();
});
