import type { ApiResult, LandingContent, Lead, LeadPayload } from '../data/types';

const API_BASE = import.meta.env.VITE_API_BASE ?? '';

async function parseJson<T>(response: Response): Promise<ApiResult<T>> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    return { ok: false, error: data?.error ?? `Ошибка ${response.status}` };
  }
  return data as ApiResult<T>;
}

export async function fetchContent(): Promise<ApiResult<LandingContent>> {
  const response = await fetch(`${API_BASE}/api/content`, { credentials: 'same-origin' });
  return parseJson<LandingContent>(response);
}

export async function submitLead(payload: LeadPayload): Promise<ApiResult<Lead>> {
  const response = await fetch(`${API_BASE}/api/leads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(payload)
  });
  return parseJson<Lead>(response);
}

export async function loginAdmin(password: string): Promise<ApiResult<{ token: string; expiresAt: string }>> {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password })
  });
  return parseJson<{ token: string; expiresAt: string }>(response);
}

export async function saveContent(content: LandingContent, token: string): Promise<ApiResult<LandingContent>> {
  const response = await fetch(`${API_BASE}/api/content`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(content)
  });
  return parseJson<LandingContent>(response);
}

export async function fetchLeads(token: string): Promise<ApiResult<Lead[]>> {
  const response = await fetch(`${API_BASE}/api/leads`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return parseJson<Lead[]>(response);
}

export async function exportLeads(token: string): Promise<ApiResult<Blob>> {
  const response = await fetch(`${API_BASE}/api/leads/export`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    return { ok: false, error: data?.error ?? `Ошибка ${response.status}` };
  }
  return { ok: true, data: await response.blob() };
}
