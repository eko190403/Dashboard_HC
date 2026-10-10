import 'server-only';

import { createServerClient } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export type AuthRole = 'People Partner' | 'HR Manager' | 'Staff';

export type AuthUser = {
    username: string;
    name: string;
    role: AuthRole;
    initials: string;
};

function getSupabaseConfig() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
        throw new Error('Supabase URL and anon key must be configured.');
    }
    return { url, anonKey };
}

export function getAuthUser(user: SupabaseUser): AuthUser {
    const role = user.app_metadata.role;
    const name = typeof user.user_metadata.name === 'string' && user.user_metadata.name.trim()
        ? user.user_metadata.name.trim()
        : user.email || 'Pengguna';

    return {
        username: user.email || user.id,
        name,
        role: role === 'People Partner' || role === 'HR Manager' ? role : 'Staff',
        initials: name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase(),
    };
}

export function createRequestSupabaseClient(request: NextRequest) {
    const { url, anonKey } = getSupabaseConfig();
    return createServerClient(url, anonKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll() {
                // The proxy refreshes Supabase cookies before API routes run.
            },
        },
    });
}

export async function authorizeWriteRequest(
    request: NextRequest,
    allowedRoles: readonly AuthRole[],
): Promise<{ user: AuthUser } | { response: Response }> {
    const supabase = createRequestSupabaseClient(request);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        return { response: Response.json({ error: 'Authentication required' }, { status: 401 }) };
    }

    const authUser = getAuthUser(user);
    if (!allowedRoles.includes(authUser.role)) {
        return { response: Response.json({ error: 'Insufficient permissions' }, { status: 403 }) };
    }

    if (request.headers.get('origin') !== new URL(request.url).origin) {
        return { response: Response.json({ error: 'Invalid request origin' }, { status: 403 }) };
    }

    return { user: authUser };
}
