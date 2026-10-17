const fs = require('node:fs');
const assert = require('node:assert/strict');
const { test } = require('node:test');
const ts = require('typescript');
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
const { bodyProgress, bodyCondition } = require('../lib/body-progress.ts');
const { emptyData, parseTraining, equipmentFor } = require('../lib/machine-training.ts');
const now = +new Date(2026, 9, 17, 15);
const at = (day, hour = 12) => +new Date(2026, 9, day, hour);
const equipment = [{ id: 'press', muscles: ['Chest'], secondary: ['Triceps'] }, { id: 'row', muscles: ['Lats', 'Upper back'], secondary: ['Biceps'] }];
const set = { weight: 40, reps: 10, done: true };
const session = (id, started, sets, demo = false) => ({ id, routine: 'Test', started, sets, demo });
const chest = sessions => bodyCondition(sessions, equipment, now).find(item => item.muscle === 'Chest');

test('today and Monday-based week count completed primary sets and volume once', () => {
  const sessions = [session('today', now, { press: [set, { ...set, done: false }], row: [set] }), session('monday', at(12), { press: [set] }), session('last-sunday', at(11), { press: [set] }), session('sample', now, { press: [set] }, true), session('future', at(18), { press: [set] })];
  const today = bodyProgress(sessions, equipment, 'today', now);
  const week = bodyProgress(sessions, equipment, 'week', now);
  assert.equal(today.sets, 2);
  assert.equal(today.volume, 800);
  assert.equal(today.counts.Chest, 1);
  assert.equal(today.counts.Triceps, 0);
  assert.equal(today.counts.Lats, 1);
  assert.equal(today.counts['Upper back'], 1);
  assert.equal(week.sets, 3);
  assert.equal(week.counts.Chest, 2);
});

test('one set glows lightly, more sets brighten it, and every day fades to off at seven days', () => {
  const one = chest([session('one', now, { press: [set] })]);
  const two = chest([session('two', now, { press: [set, set] })]);
  assert.ok(one.level > 0 && one.level < .3);
  assert.ok(two.level > one.level);
  let previous = one.level;
  for (let age = 1; age <= 7; age++) {
    const item = chest([session('old', at(17 - age), { press: [set] })]);
    assert.ok(item.level < previous);
    assert.equal(item.daysSince, age);
    previous = item.level;
  }
  assert.equal(previous, 0);
  assert.equal(chest([session('old', at(1), { press: [set] })]).level, 0);
});

test('set timestamps attribute an overnight workout correctly and retain old logs', () => {
  const overnight = session('overnight', at(16, 23), { press: [{ ...set, loggedAt: at(17, 1) }, set] });
  assert.equal(bodyProgress([overnight], equipment, 'today', now).sets, 1);
  assert.equal(bodyProgress([overnight], equipment, 'week', now).sets, 2);
  const item = chest([overnight]);
  assert.equal(item.daysSince, 0);
  assert.ok(item.score > 1 && item.score < 2);
});

test('dim muscles sort first; sample workouts, future sets, and unfinished sets stay off', () => {
  const sessions = [session('real', now, { press: [set] }), session('demo', now, { row: [set] }, true), session('future', at(18), { row: [set] }), session('draft', now, { row: [{ ...set, done: false }] })];
  const result = bodyCondition(sessions, equipment, now);
  assert.equal(result.at(-1).muscle, 'Chest');
  assert.equal(result.find(item => item.muscle === 'Lats').level, 0);
  assert.equal(result.find(item => item.muscle === 'Lats').lastTrained, null);
  assert.equal(bodyCondition([], equipment, now).every(item => item.level === 0), true);
});

test('live session wins over duplicate history and deleting a set removes its contribution', () => {
  const history = session('same', now, { press: [set, set] });
  const live = session('same', now, { press: [set] });
  assert.equal(bodyProgress([history, live], equipment, 'today', now).sets, 1);
  assert.equal(chest([history, live]).score, 1);
  assert.equal(chest([{ ...live, sets: {} }]).score, 0);
});

test('saved muscle target overrides and custom exercises drive activity', () => {
  const data = structuredClone(emptyData);
  data.muscleTargets.fly = { muscles: ['Abs'], secondary: ['Chest'] };
  data.customMachines = [{ ...equipmentFor(data)[0], id: 'custom', photoId: 'incline', muscles: ['Calves'] }];
  const sessions = [session('custom', now, { fly: [set], custom: [set] })];
  const summary = bodyProgress(sessions, equipmentFor(data), 'today', now);
  assert.equal(summary.counts.Abs, 1);
  assert.equal(summary.counts.Calves, 1);
  assert.equal(summary.counts.Chest, 0);
});

test('calendar-day decay handles daylight saving transitions', () => {
  const originalTimezone = process.env.TZ;
  process.env.TZ = 'Europe/Berlin';
  try {
    const saturday = +new Date(2026, 9, 24, 12);
    const sunday = +new Date(2026, 9, 25, 12);
    assert.equal((sunday - saturday) / 3600000, 25);
    const item = bodyCondition([session('dst', saturday, { press: [set] })], equipment, sunday).find(item => item.muscle === 'Chest');
    assert.equal(item.daysSince, 1);
    assert.ok(Math.abs(item.score - 6 / 7) < 1e-12);
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});

test('optional set timestamps roundtrip through validation and invalid timestamps are rejected', () => {
  const data = { ...structuredClone(emptyData), current: session('saved', now, { press: [{ ...set, loggedAt: now }, set] }) };
  assert.deepEqual(parseTraining(data).current, data.current);
  data.current.sets.press[0].loggedAt = -1;
  assert.throws(() => parseTraining(data), /Invalid workout data/);
});
