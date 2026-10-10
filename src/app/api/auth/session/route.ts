import { NextRequest, NextResponse } from 'next/server';
import { createRequestSupabaseClient, getAuthUser } from '@/lib/auth-server';

export async function GET(request: NextRequest) {
    try {
        const supabase = createRequestSupabaseClient(request);
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            return NextResponse.json(
                { error: 'Authentication required' },
                { status: 401, headers: { 'Cache-Control': 'no-store' } },
            );
        }
        return NextResponse.json({ user: getAuthUser(user) }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('Supabase authentication session check failed:', error);
        return NextResponse.json({ error: 'Authentication service is unavailable' }, { status: 503 });
    }
}
