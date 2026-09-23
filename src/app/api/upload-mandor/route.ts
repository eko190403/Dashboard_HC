import { NextRequest, NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Parse with SheetJS
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const rawData = xlsx.utils.sheet_to_json(sheet) as any[];

        if (rawData.length === 0) {
            return NextResponse.json({ error: 'File Excel kosong.' }, { status: 400 });
        }

        const mappings: { kit_mandor: string, nama_mandor: string, kasi: string }[] = [];

        for (const row of rawData) {
            const kit = String(row['Kode Mandor'] || '').trim();
            const nama = String(row['Nama Mandor'] || '').trim();
            const kasi = String(row['Kasie'] || row['Kasi'] || '').trim();

            if (kit) {
                mappings.push({
                    kit_mandor: kit,
                    nama_mandor: nama,
                    kasi: kasi
                });
            }
        }

        if (mappings.length === 0) {
            return NextResponse.json({ error: 'Tidak ada data Kode Mandor yang valid ditemukan di file.' }, { status: 400 });
        }

        // Deduplicate by kit_mandor (keep last occurrence)
        const uniqueMap: Record<string, { kit_mandor: string, nama_mandor: string, kasi: string }> = {};
        for (const m of mappings) {
            uniqueMap[m.kit_mandor] = m;
        }
        const uniqueMappings = Object.values(uniqueMap);

        // Batch upsert to Supabase
        const CHUNK_SIZE = 1000;
        for (let i = 0; i < uniqueMappings.length; i += CHUNK_SIZE) {
            const chunk = uniqueMappings.slice(i, i + CHUNK_SIZE);
            const { error: upsertError } = await supabase
                .from('mandor_mapping')
                .upsert(chunk, { onConflict: 'kit_mandor' });

            if (upsertError) {
                console.error('Failed to upsert mandor chunk:', upsertError);
                throw new Error(`Gagal menyimpan data mandor: ${upsertError?.message}`);
            }
        }

        return NextResponse.json({ 
            message: 'Data Master Mandor berhasil di-upload', 
            totalRows: uniqueMappings.length
        });

    } catch (error: any) {
        console.error('Error processing mandor upload:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
