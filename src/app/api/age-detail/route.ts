import { NextRequest, NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';

export const dynamic = 'force-dynamic';

const PAGE_SIZE = 100;

function getAgeRange(range: string): [number, number] {
    switch (range) {
        case '18-35': return [18, 35];
        case '36-45': return [36, 45];
        case '46-55': return [46, 55];
        case '55+': return [56, 999];
        default: return [0, 999];
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const range = searchParams.get('range') || '';
        const komoditi = searchParams.get('komoditi') || '';
        const page = parseInt(searchParams.get('page') || '1', 10);
        const search = searchParams.get('search') || '';

        const from = (page - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const [minAge, maxAge] = getAgeRange(range);

        const latestWorkbook = xlsx.read(fs.readFileSync(path.join(process.cwd(), 'PG2 21 Sept 2026.XLSX')), { raw: true });
        const referenceWorkbook = xlsx.read(fs.readFileSync(path.join(process.cwd(), 'EXPORT3.xlsx')), { raw: true });
        const latestRows = xlsx.utils.sheet_to_json<Record<string, unknown>>(latestWorkbook.Sheets[latestWorkbook.SheetNames[0]], { defval: '' });
        const referenceRows = xlsx.utils.sheet_to_json<Record<string, unknown>>(referenceWorkbook.Sheets[referenceWorkbook.SheetNames[0]], { defval: '' });
        const referenceByPersonnel = new Map(referenceRows.map(row => [String(row['Pers.No.']).trim(), row]));

        const filtered = latestRows
            .filter(row => String(row['Employment Status']).trim().toLowerCase() === 'active')
            .map(row => {
                const reference = referenceByPersonnel.get(String(row['Pers.No.']).trim());
                const rawBirthDate = row['Birth date'];
                const birthDate = typeof rawBirthDate === 'number'
                    ? new Date((rawBirthDate - 25569) * 86400 * 1000)
                    : new Date(String(rawBirthDate || ''));
                const today = new Date();
                let age = Number.NaN;
                if (!Number.isNaN(birthDate.getTime())) {
                    age = today.getFullYear() - birthDate.getFullYear();
                    if (today.getMonth() < birthDate.getMonth() || (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) age--;
                }
                const fallback = String(row['Sub Department Text'] || row['Department Text'] || '').toLowerCase();
                const fallbackKomoditi = fallback.includes('banana') ? 'Banana' : fallback.includes('guava') ? 'Guava' : fallback.includes('research') || fallback.includes('crop improvement') ? 'Research and Development' : 'PG2';
                return {
                    kit_tk: String(row['Pers.No.'] || ''),
                    employee_name: String(row['Full Name'] || ''),
                    age,
                    gender: String(row['Gender Key'] || ''),
                    komoditi: String(reference?.Choice || fallbackKomoditi),
                    bagian: String(reference?.Subdep || row['Sub Department Text'] || row['Department Text'] || 'Departemen Belum Terisi'),
                    nama_desa: String(row['Street and House Number'] || ''),
                    kecamatan: String(row.District || ''),
                };
            })
            .filter(row => {
                if (komoditi && komoditi !== 'Semua' && row.komoditi !== komoditi) return false;
                if (range === '55+' && !(row.age >= 56)) return false;
                if (range && range !== '55+' && !(row.age >= minAge && row.age <= maxAge)) return false;
                return !search || row.employee_name.toLowerCase().includes(search.toLowerCase());
            })
            .sort((a, b) => a.age - b.age);
        const count = filtered.length;
        const data = filtered.slice(from, to + 1);

        return NextResponse.json({
            data,
            page,
            totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
            totalCount: count ?? 0,
            pageSize: PAGE_SIZE,
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
