import { getDatabase } from './database';

export async function cleanDatabase() {
  const db = await getDatabase();
  
  await db.run('DELETE FROM balances');
  await db.run('DELETE FROM accounts');  
  await db.run('DELETE FROM users');
  
  console.log('Database cleaned successfully');
}

export async function resetDatabase() {
  const db = await getDatabase();
  
  await db.run('DROP TABLE IF EXISTS balances');
  await db.run('DROP TABLE IF EXISTS accounts');
  await db.run('DROP TABLE IF EXISTS users');
  
  console.log('Database reset - tables will be recreated on next API call');
}