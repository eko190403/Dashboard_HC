import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

interface AgeRow {
    age: number | null;
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const village = searchParams.get('nama_desa');
        
        // Ambil ID upload terakhir
        const { data: latestUpload, error: uploadError } = await supabase
            .from('upload_logs')
            .select('id')
            .order('uploaded_at', { ascending: false })
            .limit(1)
            .single();

        if (uploadError && uploadError.code !== 'PGRST116') {
            throw uploadError;
        }

        let query = supabase
            .from('employee_domisili')
            .select('age');

        if (latestUpload) {
            query = query.eq('upload_id', latestUpload.id);
        }
        if (village && village !== 'All') {
            query = query.eq('nama_desa', village);
        }

        // Fetch all data (handling 1000 rows limit)
        const allData: AgeRow[] = [];
        let page = 0;
        const pageSize = 1000;
        while (true) {
            const { data: pageData, error: pageError } = await query.range(page * pageSize, (page + 1) * pageSize - 1);
            if (pageError) throw pageError;
            if (pageData) allData.push(...pageData);
            if (!pageData || pageData.length < pageSize) break;
            page++;
        }

        // Hitung kelompok usia
        let range18to35 = 0;
        let range36to45 = 0;
        let range46to55 = 0;
        let rangeOver55 = 0;
        let unknown = 0;

        allData.forEach((row) => {
            const age = row.age;
            if (age === null || age === undefined || isNaN(age)) {
                unknown++;
            } else if (age >= 18 && age <= 35) {
                range18to35++;
            } else if (age >= 36 && age <= 45) {
                range36to45++;
            } else if (age >= 46 && age <= 55) {
                range46to55++;
            } else if (age > 55) {
                rangeOver55++;
            } else {
                // Below 18 goes to unknown or handle?
                unknown++;
            }
        });

        return NextResponse.json({
            data: [
                { name: '18 - 35', value: range18to35, fill: '#1e5fd4' },
                { name: '36 - 45', value: range36to45, fill: '#0ea573' },
                { name: '46 - 55', value: range46to55, fill: '#f59e0b' },
                { name: '> 55', value: rangeOver55, fill: '#e11d48' },
            ],
            unknown
        });

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        console.error('Error fetching age demographics:', error);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
