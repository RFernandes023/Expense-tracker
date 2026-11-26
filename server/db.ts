import { MongoClient, type Collection, type Db } from 'mongodb';
import { env, optionalEnv } from './env.js';

export interface UserDoc {
  _id: string; // "sub" da conta Google
  email: string;
  name: string;
  picture?: string;
  settings?: Record<string, unknown>;
  createdAt: Date;
  lastLoginAt: Date;
}
export interface TxDoc {
  _id: string;
  userId: string;
  type: 'expense' | 'income';
  amount: number;
  category: string;
  description: string;
  date: string;
  withNif?: boolean;
  recurring?: boolean;
  recurringOf?: string;
  merchant?: string;
  merchantNif?: string;
  vat?: number;
  atcud?: string;
  ocrText?: string;
  receiptId?: string;
  updatedAt: Date;
}
export interface ReceiptDoc { _id: string; userId: string; mime: string; name?: string; data: Buffer; size: number; createdAt: Date }
export interface AuthCodeDoc { _id: string; userId: string; createdAt: Date }
export interface UsageDoc { _id: string; userId: string; count: number; createdAt: Date }

// Reutiliza a ligação entre invocações da função serverless.
const g = globalThis as unknown as { __mongo?: Promise<MongoClient>; __indexes?: Promise<unknown> };

export async function getDb(): Promise<Db> {
  g.__mongo ??= new MongoClient(env('MONGODB_URI'), { maxPoolSize: 5 }).connect();
  const db = (await g.__mongo).db(optionalEnv('MONGODB_DB', 'carteira'));
  g.__indexes ??= Promise.all([
    db.collection('transactions').createIndex({ userId: 1, date: -1 }),
    db.collection('receipts').createIndex({ userId: 1 }),
    db.collection('authcodes').createIndex({ createdAt: 1 }, { expireAfterSeconds: 300 }),
    db.collection('usage').createIndex({ createdAt: 1 }, { expireAfterSeconds: 3 * 86400 })
  ]).catch(() => undefined);
  return db;
}

export async function cols() {
  const db = await getDb();
  return {
    users: db.collection<UserDoc>('users') as Collection<UserDoc>,
    transactions: db.collection<TxDoc>('transactions') as Collection<TxDoc>,
    receipts: db.collection<ReceiptDoc>('receipts') as Collection<ReceiptDoc>,
    authcodes: db.collection<AuthCodeDoc>('authcodes') as Collection<AuthCodeDoc>,
    usage: db.collection<UsageDoc>('usage') as Collection<UsageDoc>
  };
}
