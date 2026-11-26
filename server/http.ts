import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifySession } from './auth.js';

/** CORS para a app Android (Capacitor usa https://localhost) e desenvolvimento local. */
const ALLOWED_ORIGINS = ['https://localhost', 'capacitor://localhost', 'http://localhost', 'http://localhost:5173', 'http://localhost:3000'];

export function cors(req: VercelRequest, res: VercelResponse): boolean {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '86400');
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

export async function requireUser(req: VercelRequest, res: VercelResponse) {
  const h = req.headers.authorization ?? '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  const s = token ? await verifySession(token) : null;
  if (!s) res.status(401).json({ error: 'Sessão expirada. Inicia sessão novamente.' });
  return s;
}

/** Traduz erros de configuração comuns para mensagens que indicam o que corrigir. */
export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/bad auth|authentication failed/i.test(msg)) return 'Base de dados: utilizador ou password errados no MONGODB_URI.';
  if (/querySrv|ENOTFOUND|ECONNREFUSED|Server selection timed out|timed out/i.test(msg)) return 'Base de dados inacessível: confirma o MONGODB_URI e o acesso 0.0.0.0/0 em Network Access no Atlas.';
  if (/Invalid scheme|Invalid connection string|URI must include/i.test(msg)) return 'MONGODB_URI inválido: deve começar por mongodb+srv://';
  return msg || 'Erro interno';
}

export function fail(res: VercelResponse, e: unknown) {
  console.error(e);
  res.status(500).json({ error: friendlyError(e) });
}

/** Wrapper: CORS + tratamento de erros. */
export const handler = (fn: (req: VercelRequest, res: VercelResponse) => Promise<unknown>) =>
  async (req: VercelRequest, res: VercelResponse) => {
    if (cors(req, res)) return;
    try {
      await fn(req, res);
    } catch (e) {
      fail(res, e);
    }
  };
