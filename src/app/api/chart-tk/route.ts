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

        const latestWorkbook = xlsx.read(fs.readFileSync(path.join(process.cwd(), 'PG2 21 Sept 2026.XLSX')), { raw: true });
        const referenceWorkbook = xlsx.read(fs.readFileSync(path.join(process.cwd(), 'EXPORT3.xlsx')), { raw: true });
        const latestRows = xlsx.utils.sheet_to_json<Record<string, unknown>>(
            latestWorkbook.Sheets[latestWorkbook.SheetNames[0]],
            { defval: '' },
        );
        const referenceRows = xlsx.utils.sheet_to_json<Record<string, unknown>>(
            referenceWorkbook.Sheets[referenceWorkbook.SheetNames[0]],
            { defval: '' },
        );
        const referenceByPersonnel = new Map(
            referenceRows.map(row => [String(row['Pers.No.']).trim(), row]),
        );
        const referenceByName = new Map<string, Record<string, unknown>[]>();
        const referenceByMandor = new Map<string, Record<string, unknown>[]>();
        for (const row of referenceRows) {
            const name = String(row['Full Name'] || '').trim().toLowerCase();
            const mandor = String(row['Kode Mandor'] || '').trim();
            if (name) referenceByName.set(name, [...(referenceByName.get(name) || []), row]);
            if (mandor && mandor !== '0') referenceByMandor.set(mandor, [...(referenceByMandor.get(mandor) || []), row]);
        }

        const allData = latestRows
            .filter(row => String(row['Employment Status']).trim().toLowerCase() === 'active')
            .map(row => {
                const personnel = String(row['Pers.No.']).trim();
                const name = String(row['Full Name'] || '').trim().toLowerCase();
                const mandor = String(row['Kode Mandor'] || '').trim();
                const nameMatches = referenceByName.get(name) || [];
                const mandorMatches = referenceByMandor.get(mandor) || [];
                const mandorPairs = new Set(mandorMatches.map(item => `${item.Choice}|${item.Subdep}`));
                const referenceRow = referenceByPersonnel.get(personnel)
                    || (nameMatches.length === 1 ? nameMatches[0] : undefined)
                    || (mandorPairs.size === 1 ? mandorMatches[0] : undefined);
                const fallbackDepartment = String(row['Sub Department Text'] || row['Department Text'] || row['Organizational Unit'] || 'Departemen Belum Terisi').trim();
                const fallbackText = fallbackDepartment.toLowerCase();
                const fallbackChoice = fallbackText.includes('banana')
                    ? 'Banana'
                    : fallbackText.includes('guava')
                        ? 'Guava'
                        : (fallbackText.includes('research') || fallbackText.includes('crop improvement') || fallbackText.includes('plant breeding'))
                            ? 'Research and Development'
                            : 'PG2';
                const address = String(row['Street and House Number'] || '');
                const district = String(row.District || '');
                return {
                    komoditi: String(referenceRow?.Choice || row.Choice || fallbackChoice).trim(),
                    bagian: String(referenceRow?.Subdep || row.Subdep || fallbackDepartment).trim(),
                    nama_desa: normalizeDesa(address, district),
                    kecamatan: district,
                };
            });

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
