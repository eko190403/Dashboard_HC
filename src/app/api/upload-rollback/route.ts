import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const uploadId = searchParams.get('id');

        if (!uploadId) {
            return NextResponse.json({ error: 'Upload ID is required' }, { status: 400 });
        }

        // Delete from employee_domisili
        const { error: empError } = await supabase
            .from('employee_domisili')
            .delete()
            .eq('upload_id', uploadId);

        if (empError) throw new Error(`Failed to delete employee data: ${empError.message}`);

        // Delete from summary_domisili
        const { error: summaryError } = await supabase
            .from('summary_domisili')
            .delete()
            .eq('upload_id', uploadId);

        if (summaryError) throw new Error(`Failed to delete summary data: ${summaryError.message}`);

        // Delete from upload_logs
        const { error: logError } = await supabase
            .from('upload_logs')
            .delete()
            .eq('id', uploadId);

        if (logError) throw new Error(`Failed to delete upload log: ${logError.message}`);

        return NextResponse.json({ success: true, message: 'Upload successfully rolled back.' });

    } catch (error: any) {
        console.error('Error rolling back upload:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
