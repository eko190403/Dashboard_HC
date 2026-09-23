import { supabase } from '@/lib/supabase';
import HistoryClient from './page-client';

export const revalidate = 0;

export default async function HistoryPage() {
    const { data: logs } = await supabase
        .from('upload_logs')
        .select('*')
        .order('uploaded_at', { ascending: false });

    return <HistoryClient initialLogs={logs || []} />;
}
