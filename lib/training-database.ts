import 'server-only';
import { neon } from '@neondatabase/serverless';
import type { TrainingData } from './machine-training';

function database() {
  if (!process.env.DATABASE_URL) throw new Error('Database is not configured');
  return neon(process.env.DATABASE_URL);
}
export async function readAccountTraining(userId: string) {
  const sql = database();
  const rows = await sql`select data, revision from public.training_state where user_id = ${userId}`;
  return rows[0] ? { data: rows[0].data, revision: Number(rows[0].revision) } : null;
}
export async function writeAccountTraining(userId: string, data: TrainingData, revision: number) {
  const sql = database();
  // Parameterized SQL and an identity from the verified server session only.
  const rows = revision === 0
    ? await sql`insert into public.training_state (user_id, data) values (${userId}, ${JSON.stringify(data)}::jsonb) on conflict (user_id) do nothing returning revision`
    : await sql`update public.training_state set data = ${JSON.stringify(data)}::jsonb, revision = revision + 1, updated_at = now() where user_id = ${userId} and revision = ${revision} returning revision`;
  return rows[0] ? Number(rows[0].revision) : 0;
}
