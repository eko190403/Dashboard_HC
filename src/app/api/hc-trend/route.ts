import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getEffectiveMonthKey, getEffectiveMonthLabel } from '@/lib/reporting-month';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Fetch all upload logs sorted by date ascending
        const { data: uploads, error } = await supabase
            .from('upload_logs')
            .select('id, total_hc, uploaded_at, filename')
            .order('uploaded_at', { ascending: true });

        if (error) throw error;

        // Group by month and take the latest upload per month
        const monthMap = new Map<string, { total_hc: number; uploaded_at: string; month: string; label: string }>();

        (uploads || []).forEach(upload => {
            const monthKey = getEffectiveMonthKey(upload.uploaded_at);
            if (!monthKey) return;

            const label = getEffectiveMonthLabel(upload.uploaded_at);

            // Keep only the latest upload for the same reporting month
            const existing = monthMap.get(monthKey);
            if (!existing || new Date(upload.uploaded_at) > new Date(existing.uploaded_at)) {
                monthMap.set(monthKey, {
                    total_hc: upload.total_hc,
                    uploaded_at: upload.uploaded_at,
                    month: monthKey,
                    label,
                });
            }
        });

        // Convert to sorted array
        const trendData = Array.from(monthMap.values())
            .sort((a, b) => a.month.localeCompare(b.month));

        return NextResponse.json({ data: trendData });
    } catch (error: unknown) {
        console.error('Error fetching HC trend:', error);
        const message = typeof error === 'object' && error !== null && 'message' in error
            ? String(error.message)
            : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
