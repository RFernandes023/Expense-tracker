import { Capacitor } from '@capacitor/core';
import type { Settings, Transaction } from './types';

/** Há servidor (Vercel) nesta build? A versão "artifact" funciona só em modo local. */
export const HAS_BACKEND = import.meta.env.MODE !== 'artifact';
export const IS_NATIVE = Capacitor.isNativePlatform();
/** Na web usa o mesmo domínio; no Android usa o URL definido em VITE_API_URL na build. */
export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/+$/, '') ?? '';

export interface User { email: string; name: string; picture?: string }
export interface Session { token: string; user: User }

const SESSION_KEY = 'carteira-pt:session';

export function loadSession(): Session | null {
  try {
    const s = localStorage.getItem(SESSION_KEY);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}
export function saveSession(s: Session | null) {
  try {
    if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
}

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

let token = loadSession()?.token ?? '';
let onUnauthorized: () => void = () => {};
export const setToken = (t: string) => { token = t; };
export const setUnauthorizedHandler = (fn: () => void) => { onUnauthorized = fn; };

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  // No Android a app pode abrir o site da Vercel diretamente (mesmo domínio) ou usar a versão embutida (localhost).
  if (IS_NATIVE && !API_BASE && location.hostname === 'localhost') throw new ApiError('Servidor não configurado nesta app (VITE_API_URL).', 0);
  let r: Response;
  try {
    r = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers }
    });
  } catch {
    throw new ApiError('Sem ligação ao servidor. Verifica a internet.', 0);
  }
  if (r.status === 401) onUnauthorized();
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new ApiError(body.error ?? `Erro ${r.status}`, r.status);
  }
  const ct = r.headers.get('content-type') ?? '';
  return (ct.includes('application/json') ? r.json() : r.blob()) as Promise<T>;
}

export const loginUrl = (platform: 'web' | 'android') => `${API_BASE}/api/auth/google?platform=${platform}`;

export const api = {
  exchange: (code: string) => req<{ token: string; user: User; settings: Partial<Settings> | null }>('/api/auth/exchange', { method: 'POST', body: JSON.stringify({ code }) }),
  me: () => req<{ user: User; settings: Partial<Settings> | null }>('/api/me'),
  saveSettings: (settings: Settings) => req('/api/me', { method: 'PUT', body: JSON.stringify({ settings }) }),
  list: () => req<{ transactions: Transaction[] }>('/api/transactions'),
  upsert: (transactions: Transaction[]) => req<{ saved: number }>('/api/transactions', { method: 'POST', body: JSON.stringify({ transactions }) }),
  removeAll: () => req('/api/transactions?all=1', { method: 'DELETE' }),
  remove: (id: string) => req('/api/transactions?id=' + encodeURIComponent(id), { method: 'DELETE' }),
  ocr: (body: { mime?: string; data?: string; name?: string; text?: string }) => req<OcrResult>('/api/ocr', { method: 'POST', body: JSON.stringify(body) }),
  receipt: (id: string) => req<Blob>('/api/receipts?id=' + encodeURIComponent(id))
};

export interface OcrResult {
  source: 'ocr' | 'text';
  receiptId: string | null;
  invoice: {
    merchant: string; merchantNif: string; customerNif: string; date: string; total: number; vatTotal: number;
    atcud: string; documentType: string; category: string; description: string;
    items: { name: string; total: number }[]; rawText: string; confidence: number;
  };
}

/** Prepara o ficheiro para envio: imagens são reduzidas (máx. 2000 px, JPEG) para poupar dados e caber no limite. */
export async function prepareFile(file: File): Promise<{ mime: string; data: string; name: string }> {
  const MAX = 3 * 1024 * 1024;
  let blob: Blob = file;
  let mime = file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
  if (mime.startsWith('image/')) {
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bmp.width * scale);
      canvas.height = Math.round(bmp.height * scale);
      canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      blob = await new Promise<Blob>((ok, ko) => canvas.toBlob((b) => (b ? ok(b) : ko(new Error('canvas'))), 'image/jpeg', 0.85));
      mime = 'image/jpeg';
    } catch { /* formato que o browser não descodifica (ex.: HEIC): envia o original */ }
  }
  if (blob.size > MAX) throw new Error('Ficheiro demasiado grande (máx. 3 MB). Tira uma foto ou exporta o PDF com menor resolução.');
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = '';
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { mime, data: btoa(bin), name: file.name };
}
