import 'server-only';

import { createHmac, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { NextRequest } from 'next/server';

const scrypt = promisify(scryptCallback);
export const AUTH_SESSION_COOKIE = 'hr_pg2_session';
export const AUTH_SESSION_TTL_SECONDS = 60 * 60 * 8;

export type AuthRole = 'People Partner' | 'HR Manager' | 'Staff';

export type AuthUser = {
    username: string;
    name: string;
    role: AuthRole;
    initials: string;
};

type ConfiguredUser = AuthUser & {
    passwordHash: string;
};

type SessionPayload = {
    sub: string;
    exp: number;
};

function getSessionSecret(): string {
    const secret = process.env.AUTH_SESSION_SECRET;
    if (!secret || Buffer.byteLength(secret) < 32) {
        throw new Error('AUTH_SESSION_SECRET must contain at least 32 bytes.');
    }
    return secret;
}

function getConfiguredUsers(): ConfiguredUser[] {
    const rawUsers = process.env.HR_USERS_JSON;
    if (!rawUsers) {
        throw new Error('HR_USERS_JSON is not configured.');
    }

    let parsed: unknown;
    try {
        parsed = JSON.parse(rawUsers);
    } catch {
        throw new Error('HR_USERS_JSON must be a valid JSON array.');
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('HR_USERS_JSON must contain at least one user.');
    }

    const users: ConfiguredUser[] = [];
    const usernames = new Set<string>();

    for (const value of parsed) {
        if (typeof value !== 'object' || value === null) {
            throw new Error('Each HR_USERS_JSON entry must be an object.');
        }

        const user = value as Record<string, unknown>;
        const { username, name, role, initials, passwordHash } = user;
        if (
            typeof username !== 'string' || !username.trim()
            || typeof name !== 'string' || !name.trim()
            || (role !== 'People Partner' && role !== 'HR Manager' && role !== 'Staff')
            || typeof initials !== 'string' || !initials.trim()
            || typeof passwordHash !== 'string'
            || !/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/i.test(passwordHash)
        ) {
            throw new Error('HR_USERS_JSON contains an invalid user or password hash.');
        }

        const normalizedUsername = username.trim().toLowerCase();
        if (usernames.has(normalizedUsername)) {
            throw new Error(`Duplicate username in HR_USERS_JSON: ${normalizedUsername}`);
        }
        usernames.add(normalizedUsername);

        users.push({
            username: username.trim(),
            name: name.trim(),
            role,
            initials: initials.trim(),
            passwordHash,
        });
    }

    return users;
}

export async function authenticateCredentials(username: string, password: string): Promise<AuthUser | null> {
    const normalizedUsername = username.trim().toLowerCase();
    const user = getConfiguredUsers().find(candidate => candidate.username.toLowerCase() === normalizedUsername);
    if (!user) return null;

    const [, salt, expectedHex] = user.passwordHash.split('$');
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = await scrypt(password, salt, expected.length) as Buffer;
    if (!timingSafeEqual(actual, expected)) return null;

    return {
        username: user.username,
        name: user.name,
        role: user.role,
        initials: user.initials,
    };
}

export function createSessionToken(username: string): string {
    const userExists = getConfiguredUsers().some(user => user.username.toLowerCase() === username.toLowerCase());
    if (!userExists) {
        throw new Error('Cannot create a session for an unknown user.');
    }

    const payload: SessionPayload = {
        sub: username,
        exp: Date.now() + AUTH_SESSION_TTL_SECONDS * 1000,
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = createHmac('sha256', getSessionSecret()).update(encodedPayload).digest('base64url');
    return `${encodedPayload}.${signature}`;
}

export function getSessionUser(token: string | undefined): AuthUser | null {
    if (!token) return null;

    const [encodedPayload, encodedSignature, extra] = token.split('.');
    if (!encodedPayload || !encodedSignature || extra !== undefined) return null;

    const expectedSignature = createHmac('sha256', getSessionSecret()).update(encodedPayload).digest();
    let actualSignature: Buffer;
    try {
        actualSignature = Buffer.from(encodedSignature, 'base64url');
    } catch {
        return null;
    }
    if (
        actualSignature.length !== expectedSignature.length
        || !timingSafeEqual(actualSignature, expectedSignature)
    ) {
        return null;
    }

    let payload: unknown;
    try {
        payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    } catch {
        return null;
    }

    if (
        typeof payload !== 'object' || payload === null
        || !('sub' in payload) || typeof payload.sub !== 'string'
        || !('exp' in payload) || typeof payload.exp !== 'number'
        || Date.now() >= payload.exp
    ) {
        return null;
    }

    const sessionUsername = payload.sub;
    const user = getConfiguredUsers().find(candidate => candidate.username.toLowerCase() === sessionUsername.toLowerCase());
    if (!user) return null;

    return {
        username: user.username,
        name: user.name,
        role: user.role,
        initials: user.initials,
    };
}

export function authorizeWriteRequest(
    request: NextRequest,
    allowedRoles: readonly AuthRole[],
): { user: AuthUser } | { response: Response } {
    const user = getSessionUser(request.cookies.get(AUTH_SESSION_COOKIE)?.value);
    if (!user) {
        return { response: Response.json({ error: 'Authentication required' }, { status: 401 }) };
    }

    if (!allowedRoles.includes(user.role)) {
        return { response: Response.json({ error: 'Insufficient permissions' }, { status: 403 }) };
    }

    const requestOrigin = request.headers.get('origin');
    if (requestOrigin !== new URL(request.url).origin) {
        return { response: Response.json({ error: 'Invalid request origin' }, { status: 403 }) };
    }

    return { user };
}
