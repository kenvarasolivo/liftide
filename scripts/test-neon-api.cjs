const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const assert = require('node:assert/strict');
const { test, before, after } = require('node:test');
const ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');
const root = path.resolve(__dirname, '..');
const migration = fs.readFileSync(path.join(root, 'neon/migrations/001_training_state.sql'), 'utf8');
let db, session = null, configured = true;
require.extensions['.ts'] = (module, file) => module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
const originalLoad = Module._load;
Module._load = function(request, parent, main) {
  if (request === 'server-only') return {};
  if (request === '@/lib/auth-server') return { getNeonAuth: () => configured ? { getSession: async () => ({ data: session, error: null }) } : null };
  if (request === '@neondatabase/serverless') return { neon: () => async (strings, ...values) => {
    let query = strings[0];
    values.forEach((_, i) => { query += `$${i + 1}` + strings[i + 1]; });
    return (await db.query(query, values)).rows;
  } };
  if (request.startsWith('@/')) return originalLoad.call(this, path.join(root, request.slice(2) + '.ts'), parent, main);
  return originalLoad.call(this, request, parent, main);
};
process.env.DATABASE_URL = 'test-only';
const { GET, PUT } = require('../app/api/training/route.ts');
const { emptyData } = require('../lib/machine-training.ts');
const body = (name, revision = 0) => ({ data: { ...structuredClone(emptyData), name }, revision });
const put = (payload, origin = 'http://localhost:3000') => PUT(new Request('http://localhost:3000/api/training', { method: 'PUT', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }));
before(async () => {
  db = new PGlite();
  await db.exec('create schema neon_auth; create table neon_auth."user" (id text primary key); insert into neon_auth."user" values (\'alice\'), (\'bob\');');
  await db.exec(migration);
});
after(async () => { await db.close(); Module._load = originalLoad; });

test('training APIs reject missing sessions and missing configuration', async () => {
  session = null;
  assert.equal((await GET()).status, 401); assert.equal((await put(body('No user'))).status, 401);
  configured = false; assert.equal((await GET()).status, 503); configured = true;
});
test('authenticated API rejects foreign origins and invalid training data', async () => {
  session = { user: { id: 'alice' } };
  assert.equal((await put(body('Bad origin'), 'https://other.example')).status, 403);
  assert.equal((await put({ data: {}, revision: 0 })).status, 400);
  assert.equal((await put(body('Invalid revision', -1))).status, 400);
});
test('caller-supplied owner IDs are ignored and each account sees only its row', async () => {
  session = { user: { id: 'alice' } };
  assert.equal((await put({ ...body('Alice'), userId: 'bob' })).status, 200);
  assert.equal((await (await GET()).json()).record.data.name, 'Alice');
  session = { user: { id: 'bob' } };
  assert.equal((await (await GET()).json()).record, null);
  assert.equal((await put(body('Bob'))).status, 200);
});
test('atomic revisions reject stale updates and preserve the existing record', async () => {
  session = { user: { id: 'alice' } };
  assert.equal((await put(body('Duplicate insert'))).status, 409);
  assert.equal((await put(body('Alice updated', 1))).status, 200);
  assert.equal((await put(body('Stale device', 1))).status, 409);
  assert.equal((await (await GET()).json()).record.data.name, 'Alice updated');
});
test('deleting managed Auth users cascades their training rows', async () => {
  await db.query('delete from neon_auth."user" where id = $1', ['bob']);
  assert.equal((await db.query('select * from training_state where user_id = $1', ['bob'])).rows.length, 0);
});
test('migration also matches UUID managed Auth user IDs', async () => {
  const other = new PGlite();
  try {
    await other.exec('create schema neon_auth; create table neon_auth."user" (id uuid primary key);');
    await other.exec(migration);
    const result = await other.query("select data_type from information_schema.columns where table_name = 'training_state' and column_name = 'user_id'");
    assert.equal(result.rows[0].data_type, 'uuid');
  } finally { await other.close(); }
});
