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
        const masterWorkbook = xlsx.read(fs.readFileSync(path.join(process.cwd(), '17092026B.XLSX')), { raw: true });
        const latestRows = xlsx.utils.sheet_to_json<Record<string, unknown>>(
            latestWorkbook.Sheets[latestWorkbook.SheetNames[0]],
            { defval: '' },
        );
        const masterRows = xlsx.utils.sheet_to_json<Record<string, unknown>>(
            masterWorkbook.Sheets[masterWorkbook.SheetNames[0]],
            { defval: '' },
        );
        const masterByPersonnel = new Map(
            masterRows.map(row => [String(row['Pers.No.']).trim(), row]),
        );

        const allData = latestRows
            .filter(row => String(row['Employment Status']).trim().toLowerCase() === 'active')
            .map(row => {
                const masterRow = masterByPersonnel.get(String(row['Pers.No.']).trim());
                const department = String(
                    masterRow?.Subdep2 || row['Sub Department Text'] || row['Department Text'] || 'Departemen Belum Terisi',
                ).trim().replace(/^SubDep\s*/i, '');
                const normalizedDepartment = department.toLowerCase();
                let komoditi = 'Field & Support';
                if (normalizedDepartment.includes('qc processed pineapple')) komoditi = 'QCPP';
                else if (normalizedDepartment.includes('wilayah') || normalizedDepartment.includes('harvesting & transport') || normalizedDepartment === 'ppn pg2') komoditi = 'Pine';
                else if (normalizedDepartment.includes('guava')) komoditi = 'Guava';
                else if (normalizedDepartment.includes('banana')) komoditi = 'Banana';
                else if (normalizedDepartment.includes('planting')) komoditi = 'Planting';
                else if (normalizedDepartment.includes('agritech') || normalizedDepartment.includes('system data')) komoditi = 'Agritech';
                else if (normalizedDepartment.includes('research') || normalizedDepartment.includes('biofertilizer') || normalizedDepartment.includes('plant breeding') || normalizedDepartment.includes('durian') || normalizedDepartment.includes('operation improvement')) komoditi = 'Riset & R&D';

                const address = String(row['Street and House Number'] || '');
                const district = String(row.District || '');
                return {
                    komoditi,
                    bagian: department || 'Tidak Diketahui',
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
            const rowData: Record<string, unknown> = { bagian };
            topDesa.forEach(desa => rowData[desa] = 0);

            Object.entries(desaCounts).forEach(([desa, count]) => {
                rowData[desa] = count;
            });

            return rowData;
        });

        // Urutkan: Pine wilayah numerik dulu
        const sortedResult = result
            .filter(row => {
                // Buang baris yang totalnya 0 (tidak ada TK untuk filter ini)
                const total = topDesa.reduce((s, d) => s + (Number(row[d]) || 0), 0);
                return total > 0;
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
        const ORDER = ['Pine', 'Guava', 'Banana', 'QCPP', 'Planting', 'Agritech', 'Riset & R&D', 'Field & Support'];
        const allKomoditi = [...komoditiSet].sort((a, b) => {
            const ia = ORDER.indexOf(a);
            const ib = ORDER.indexOf(b);
            if (ia === -1 && ib === -1) return a.localeCompare(b);
            if (ia === -1) return 1;
            if (ib === -1) return -1;
            return ia - ib;
        });

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
