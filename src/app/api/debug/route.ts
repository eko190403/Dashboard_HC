import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    const { data: latestUpload } = await supabase
        .from('upload_logs')
        .select('id')
        .order('id', { ascending: false })
        .limit(1)
        .single();
    
    const { data, error } = await supabase
        .from('employee_domisili')
        .select('*')
        .limit(5);
    
    return NextResponse.json({ latestUpload, data, error });
}
