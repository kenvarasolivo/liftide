const fs = require('node:fs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
const { trainingShareSummary } = require('../lib/training-share.ts');
const equipment = [{ id: 'press', muscles: ['Chest'], secondary: ['Shoulders'] }, { id: 'custom', muscles: ['Shoulders'], secondary: ['Triceps'] }];
const now = new Date(2026, 9, 17, 15).getTime();
const set = { weight: 40, reps: 10, done: true };
const session = (id, started, sets, demo = false) => ({ id, started, sets, demo });

test('today includes completed sets from multiple workouts and excludes samples, drafts and other dates', () => {
  const sessions = [
    session('morning', +new Date(2026, 9, 17, 0), { press: [set, { ...set, done: false }] }),
    session('open', now, { custom: [set, set] }),
    session('yesterday', +new Date(2026, 9, 16, 23, 59), { press: [set] }),
    session('tomorrow', +new Date(2026, 9, 18, 0), { press: [set] }),
    session('sample', now, { press: [set] }, true),
  ];
  assert.deepEqual(trainingShareSummary(sessions, equipment, 'today', now), { sets: 3, kg: 1200, muscles: ['Chest', 'Shoulders'], secondary: ['Triceps'] });
});

test('this week uses Monday through Sunday, counting volume once even for missing equipment', () => {
  const sessions = [
    session('last-sunday', +new Date(2026, 9, 11, 23, 59), { press: [set] }),
    session('monday', +new Date(2026, 9, 12), { press: [set], deleted: [{ ...set, weight: 12.5, reps: 3 }] }),
    session('sunday', +new Date(2026, 9, 18, 23, 59), { custom: [set] }),
    session('next-monday', +new Date(2026, 9, 19), { press: [set] }),
    session('sample', now, { press: [set] }, true),
  ];
  const expected = { sets: 3, kg: 837.5, muscles: ['Chest', 'Shoulders'], secondary: ['Triceps'] };
  assert.deepEqual(trainingShareSummary(sessions, equipment, 'week', now), expected);
  assert.deepEqual(trainingShareSummary(sessions, equipment, 'week', +new Date(2026, 9, 18, 12)), expected);
  assert.deepEqual(trainingShareSummary(sessions, equipment, 'week', +new Date(2026, 9, 12)), expected);
  assert.deepEqual(trainingShareSummary([], equipment, 'today', now), { sets: 0, kg: 0, muscles: [], secondary: [] });
});
