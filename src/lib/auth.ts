'use client';

export type AuthRole = 'People Partner' | 'HR Manager' | 'Staff';

export interface User {
  username: string;
  name: string;
  role: AuthRole;
  initials: string;
  avatar?: string;
}

const KEY = 'hr_pg2_user';

function isUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false;
  const user = value as Record<string, unknown>;
  return typeof user.username === 'string'
    && typeof user.name === 'string'
    && (user.role === 'People Partner' || user.role === 'HR Manager' || user.role === 'Staff')
    && typeof user.initials === 'string';
}

export async function login(username: string, password: string): Promise<User | null> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error('Authentication service is unavailable.');

  const result: unknown = await response.json();
  if (typeof result !== 'object' || result === null || !('user' in result) || !isUser(result.user)) {
    return null;
  }

  localStorage.setItem(KEY, JSON.stringify(result.user));
  return result.user;
}

export async function hasValidSession(): Promise<boolean> {
  const response = await fetch('/api/auth/session', { cache: 'no-store' });
  return response.ok;
}

export async function logout(): Promise<void> {
  const response = await fetch('/api/auth/logout', { method: 'POST' });
  if (!response.ok) {
    throw new Error('Gagal mengakhiri sesi. Silakan coba lagi.');
  }

  localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent('hr-user-updated', { detail: null }));
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    return isUser(value) ? value : null;
  } catch {
    return null;
  }
}

export function updateUser(updates: Partial<Pick<User, 'name' | 'avatar'>>): User | null {
  const current = getUser();
  if (!current) return null;
  const name = updates.name?.trim() || current.name;
  const updated: User = {
    ...current,
    ...updates,
    name,
    initials: name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase(),
  };

  localStorage.setItem(KEY, JSON.stringify(updated));
  window.dispatchEvent(new CustomEvent('hr-user-updated', { detail: updated }));
  return updated;
}
