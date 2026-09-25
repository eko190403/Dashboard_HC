import { NextRequest, NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import path from 'node:path';
import fs from 'node:fs';
import { normalizeDesa } from '@/lib/normalizer';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filterKomoditi = searchParams.get('komoditi') || 'Semua';

        const workbook = xlsx.read(fs.readFileSync(path.join(process.cwd(), 'EXPORT3.xlsx')), { raw: true });
        const rows = xlsx.utils.sheet_to_json<Record<string, unknown>>(
            workbook.Sheets[workbook.SheetNames[0]],
            { defval: '' },
        );

        const allData = rows
            .filter(row => String(row['Employment Status']).trim().toLowerCase() === 'active')
            .map(row => {
                const address = String(row['Street and House Number'] || '');
                const district = String(row.District || '');
                return {
                    komoditi: String(row.Choice || '').trim(),
                    bagian: String(row.Subdep || '').trim(),
                    nama_desa: normalizeDesa(address, district),
                    kecamatan: district,
                };
            })
            .filter(row => row.komoditi && row.bagian);

        // Hitung total per komoditi (untuk Pie Chart)
        const komoditiCounts: Record<string, number> = {};
        
        allData.forEach((row) => {
            const komoditi = row.komoditi;
            komoditiCounts[komoditi] = (komoditiCounts[komoditi] || 0) + 1;
        });

        // Data filter untuk Bar Chart
        const filteredData = filterKomoditi && filterKomoditi !== 'Semua' 
            ? allData.filter(row => row.komoditi === filterKomoditi)
            : allData;

        // Hitung jumlah TK per bagian & desa
        const bagianDesaCounts: Record<string, Record<string, number>> = {};
        const desaTotalCounts: Record<string, number> = {};
        const komoditiSet = new Set<string>(Object.keys(komoditiCounts));

        filteredData.forEach((row) => {
            const bagian = row.bagian;
            const komoditi = row.komoditi;
            const desa = row.nama_desa;

            komoditiSet.add(komoditi);

            if (!bagianDesaCounts[bagian]) bagianDesaCounts[bagian] = {};
            bagianDesaCounts[bagian][desa] = (bagianDesaCounts[bagian][desa] || 0) + 1;
            desaTotalCounts[desa] = (desaTotalCounts[desa] || 0) + 1;
        });

        // Keep every desa so the chart never hides data under a synthetic category.
        const topDesa = Object.entries(desaTotalCounts)
            .sort((a, b) => b[1] - a[1])
            .map(d => d[0]);

        // Format data untuk Recharts
        const result = Object.entries(bagianDesaCounts).map(([bagian, desaCounts]) => {
            const total = Object.values(desaCounts).reduce((sum, count) => sum + count, 0);
            const rowData: Record<string, unknown> = { bagian, total };

            Object.entries(desaCounts).forEach(([desa, count]) => {
                rowData[desa] = count;
            });

            return rowData;
        });

        // Urutkan: Pine wilayah numerik dulu
        const sortedResult = result
            .filter(row => {
                // Buang baris yang totalnya 0 (tidak ada TK untuk filter ini)
                return Number(row.total) > 0;
            })
            .sort((a, b) => {
                const bagianA = String(a.bagian);
                const bagianB = String(b.bagian);
                const numA = parseInt(bagianA.replace(/\D/g, '')) || 999;
                const numB = parseInt(bagianB.replace(/\D/g, '')) || 999;
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return bagianA.localeCompare(bagianB);
            });

        // Daftar komoditi yang tersedia (untuk Pie Chart / tab)
        const allKomoditi = [...komoditiSet].sort((a, b) => a.localeCompare(b));

        const komoditiSummary = allKomoditi.map(name => ({
            name,
            value: komoditiCounts[name] || 0
        }));

        return NextResponse.json({
            data: sortedResult,
            topDesa,
            komoditiSummary,
            totalRows: allData.length,
        });

    } catch (error: any) {
        console.error('Error fetching chart data:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
