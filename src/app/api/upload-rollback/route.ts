import { NextRequest, NextResponse } from 'next/server';
import { authorizeWriteRequest } from '@/lib/auth-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function DELETE(request: NextRequest) {
    const authorization = await authorizeWriteRequest(request, ['People Partner', 'HR Manager']);
    if ('response' in authorization) return authorization.response;

    try {
        const supabaseAdmin = getSupabaseAdmin();
        const { searchParams } = new URL(request.url);
        const uploadId = searchParams.get('id');

        if (!uploadId) {
            return NextResponse.json({ error: 'Upload ID is required' }, { status: 400 });
        }

        // Delete from employee_domisili
        const { error: empError } = await supabaseAdmin
            .from('employee_domisili')
            .delete()
            .eq('upload_id', uploadId);

        if (empError) throw new Error(`Failed to delete employee data: ${empError.message}`);

        // Delete from summary_domisili
        const { error: summaryError } = await supabaseAdmin
            .from('summary_domisili')
            .delete()
            .eq('upload_id', uploadId);

        if (summaryError) throw new Error(`Failed to delete summary data: ${summaryError.message}`);

        // Delete from upload_logs
        const { error: logError } = await supabaseAdmin
            .from('upload_logs')
            .delete()
            .eq('id', uploadId);

        if (logError) throw new Error(`Failed to delete upload log: ${logError.message}`);

        return NextResponse.json({ success: true, message: 'Upload successfully rolled back.' });

    } catch (error: unknown) {
        console.error('Error rolling back upload:', error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
