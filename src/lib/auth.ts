export interface User {
  username: string;
  name: string;
  role: string;
  initials: string;
}

const USERS: Array<User & { password: string }> = [
  { username: 'admin',   password: 'admin123',     name: 'Admin HR',    role: 'People Partner', initials: 'AH' },
  { username: 'manager', password: 'manager2024',  name: 'HR Manager',  role: 'HR Manager',     initials: 'HM' },
  { username: 'staff',   password: 'staff2024',    name: 'Staff HR',    role: 'Staff',          initials: 'SH' },
];

const KEY = 'hr_pg2_user';

export function login(username: string, password: string): User | null {
  const match = USERS.find(
    u =>
      u.username.toLowerCase() === username.toLowerCase().trim() &&
      u.password === password
  );
  if (!match) return null;
  const user: User = {
    username: match.username,
    name:     match.name,
    role:     match.role,
    initials: match.initials,
  };
  if (typeof window !== 'undefined') {
    localStorage.setItem(KEY, JSON.stringify(user));
  }
  return user;
}

export function logout(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(KEY);
  }
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getUser() !== null;
}
