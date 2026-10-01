export interface User {
  username: string;
  name: string;
  role: string;
  initials: string;
  avatar?: string;
}

const USERS: Array<User & { password: string }> = [
  { username: 'admin',   password: 'admin123',     name: 'Admin HR',    role: 'People Partner', initials: 'AH' },
  { username: 'manager', password: 'manager2024',  name: 'HR Manager',  role: 'HR Manager',     initials: 'HM' },
  { username: 'staff',   password: 'staff2024',    name: 'Staff HR',    role: 'Staff',          initials: 'SH' },
];

const KEY = 'hr_pg2_user';
const SESSION_KEY = 'hr_pg2_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 8;

function setSessionCookie(value: string): void {
  if (typeof document === 'undefined') return;
  const expires = new Date(Date.now() + SESSION_TTL_MS).toUTCString();
  document.cookie = `${SESSION_KEY}=${encodeURIComponent(value)}; path=/; expires=${expires}; SameSite=Lax`;
}

function clearSessionCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${SESSION_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
}

export function getSessionUserFromCookie(): User | null {
  if (typeof document === 'undefined') return null;

  try {
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith(`${SESSION_KEY}=`))
      ?.split('=')[1];

    if (!cookieValue) return null;

    const parsed = JSON.parse(decodeURIComponent(cookieValue)) as { username?: string; exp?: number };
    const parsedUsername = typeof parsed.username === 'string' ? parsed.username : '';
    if (!parsedUsername || !parsed.exp || Date.now() > parsed.exp) {
      clearSessionCookie();
      return null;
    }

    const match = USERS.find(u => u.username.toLowerCase() === parsedUsername.toLowerCase());
    if (!match) return null;

    return {
      username: match.username,
      name: match.name,
      role: match.role,
      initials: match.initials,
    };
  } catch {
    clearSessionCookie();
    return null;
  }
}

export function login(username: string, password: string): User | null {
  const match = USERS.find(
    u =>
      u.username.toLowerCase() === username.toLowerCase().trim() &&
      u.password === password
  );
  if (!match) return null;

  const user: User = {
    username: match.username,
    name: match.name,
    role: match.role,
    initials: match.initials,
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(KEY, JSON.stringify(user));
    setSessionCookie(JSON.stringify({ username: user.username, exp: Date.now() + SESSION_TTL_MS }));
  }

  return user;
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(KEY);
    clearSessionCookie();
  }
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      return JSON.parse(raw) as User;
    }

    return getSessionUserFromCookie();
  } catch {
    return getSessionUserFromCookie();
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
  setSessionCookie(JSON.stringify({ username: updated.username, exp: Date.now() + SESSION_TTL_MS }));
  window.dispatchEvent(new CustomEvent('hr-user-updated', { detail: updated }));
  return updated;
}

export function isAuthenticated(): boolean {
  return getUser() !== null;
}
