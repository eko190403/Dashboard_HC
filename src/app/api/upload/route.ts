import { NextRequest, NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import path from 'node:path';
import fs from 'node:fs';
import { supabase } from '@/lib/supabase';
import { normalizeDesa, normalizeGender } from '@/lib/normalizer';

function getKomoditiAndBagian(row: any): { komoditi: string; bagian: string } {
    // Baca langsung dari kolom SAP yang sudah terstruktur
    const subDepRaw = String(row['Sub Department Text'] || '').trim();
    const depRaw = String(row['Department Text'] || '').trim();
    const subDepLow = subDepRaw.toLowerCase();
    const depLow = depRaw.toLowerCase();

    // --- GUAVA (Jambu) ---
    if (subDepLow.includes('guava') || depLow.includes('guava')) {
        if (subDepLow.includes('harvest')) return { komoditi: 'Guava', bagian: 'Guava Harvest' };
        if (subDepLow.includes('qc')) return { komoditi: 'Guava', bagian: 'Guava QC' };
        if (subDepLow.includes('spraying') || subDepLow.includes('field service')) return { komoditi: 'Guava', bagian: 'Guava Spraying' };
        return { komoditi: 'Guava', bagian: 'Guava Plantation' };
    }

    // --- BANANA (Pisang) ---
    if (subDepLow.includes('banana') || depLow.includes('banana')) {
        if (subDepLow.includes('qc')) return { komoditi: 'Banana', bagian: 'Banana QC' };
        if (subDepLow.includes('ph') || subDepLow.includes('packing')) return { komoditi: 'Banana', bagian: 'Banana Harvest & PH' };
        if (subDepLow.includes('support')) return { komoditi: 'Banana', bagian: 'Banana Support' };
        return { komoditi: 'Banana', bagian: 'Banana Plantation' };
    }

    // --- RISET / R&D ---
    if (subDepLow.includes('plant breeding') || subDepLow.includes('biofertilizer') || subDepLow.includes('durian') || subDepLow.includes('coconut') || subDepLow.includes('operation improvement') || depLow.includes('crop improvement') || depLow.includes('new crop') || depLow.includes('sustainable')) {
        return { komoditi: 'Research and Development', bagian: subDepRaw.replace(/^SubDep\s*/i, '') || depRaw };
    }

    // --- Fallback (PG2) ---
    const bagianFallback = subDepRaw.replace(/^SubDep\s*/i, '') || depRaw || 'PG2 Lainnya';
    return { komoditi: 'PG2', bagian: bagianFallback };
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload original file to Supabase Storage Bucket 'excel-backups' if needed
        // For now, we will process it first
        const filename = `${Date.now()}_${file.name}`;
        
        const { error: storageError } = await supabase.storage
            .from('excel-backups')
            .upload(filename, buffer, {
                contentType: file.type,
            });
        
        if (storageError) {
            console.warn('Could not upload to storage bucket. Proceeding with parsing...', storageError);
        }

        // Parse with SheetJS
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const rawData = xlsx.utils.sheet_to_json(sheet) as any[];

        const masterPath = path.join(process.cwd(), 'EXPORT3.xlsx');
        const masterWorkbook = xlsx.read(fs.readFileSync(masterPath), { raw: true });
        const masterRows = xlsx.utils.sheet_to_json(masterWorkbook.Sheets[masterWorkbook.SheetNames[0]], { defval: '' }) as any[];
        const masterByPersonnel = new Map(masterRows.map(row => [String(row['Pers.No.']).trim(), row]));
        const masterByName = new Map<string, any[]>();
        const masterByMandor = new Map<string, any[]>();
        masterRows.forEach(row => {
            const name = String(row['Full Name'] || '').trim().toLowerCase();
            const mandor = String(row['Kode Mandor'] || '').trim();
            if (name) masterByName.set(name, [...(masterByName.get(name) || []), row]);
            if (mandor && mandor !== '0') masterByMandor.set(mandor, [...(masterByMandor.get(mandor) || []), row]);
        });

        // Load secondary master for Kasie
        let secondaryKasieMap = new Map<string, string>();
        try {
            const secondaryPath = path.join(process.cwd(), '17092026B.XLSX');
            if (fs.existsSync(secondaryPath)) {
                const secWb = xlsx.read(fs.readFileSync(secondaryPath), { raw: true });
                const secRows = xlsx.utils.sheet_to_json(secWb.Sheets[secWb.SheetNames[0]], { defval: '' }) as any[];
                secRows.forEach(row => {
                    const pers = String(row['Pers.No.']).trim();
                    const kasie = String(row['Kasie'] || '').trim();
                    if (pers && kasie) secondaryKasieMap.set(pers, kasie);
                });
            }
        } catch (e) {
            console.warn('Failed to load secondary Kasie map:', e);
        }

        // Fetch mandor mapping
        const { data: mandorData, error: mandorError } = await supabase
            .from('mandor_mapping')
            .select('*');
            
        const mandorMap: Record<string, any> = {};
        if (mandorData) {
            mandorData.forEach(m => {
                mandorMap[m.kit_mandor] = m;
            });
        }

        let totalHc = 0;
        const villageCounts: Record<string, { count: number; district: string; laki: number; perempuan: number }> = {};
        const employeeRecords: any[] = [];

        for (const row of rawData) {
            const rawAddr = row['Street and House Number'];
            const district = row['District'] || '';
            const status = row['Employment Status'] || '';
            const gender = normalizeGender(row['Gender Key']);

            // Skip empty rows if necessary
            if (rawAddr === undefined && district === '') continue;

            // Only count active employees
            if (status && status.toLowerCase() !== 'active') {
                continue;
            }

            const normalizedDesa = normalizeDesa(rawAddr, district);
            
            if (!villageCounts[normalizedDesa]) {
                villageCounts[normalizedDesa] = { count: 0, district: district, laki: 0, perempuan: 0 };
            }
            villageCounts[normalizedDesa].count += 1;
            if (gender === 'L') {
                villageCounts[normalizedDesa].laki += 1;
            } else if (gender === 'P') {
                villageCounts[normalizedDesa].perempuan += 1;
            }
            totalHc += 1;

            // Calculate Age & Birth Date
            let age = null;
            let formattedBirthDate = null;
            const rawBirthDate = row['Birth date'];
            if (rawBirthDate) {
                let birthDate: Date;
                if (typeof rawBirthDate === 'number') {
                    // Excel stores dates as days since Jan 1, 1900
                    birthDate = new Date((rawBirthDate - 25569) * 86400 * 1000);
                } else {
                    birthDate = new Date(rawBirthDate);
                }

                if (!isNaN(birthDate.getTime())) {
                    const today = new Date();
                    let computedAge = today.getFullYear() - birthDate.getFullYear();
                    const m = today.getMonth() - birthDate.getMonth();
                    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                        computedAge--;
                    }
                    age = computedAge;
                    
                    // Format birth_date to YYYY-MM-DD
                    const y = birthDate.getFullYear();
                    const m_str = String(birthDate.getMonth() + 1).padStart(2, '0');
                    const d_str = String(birthDate.getDate()).padStart(2, '0');
                    formattedBirthDate = `${y}-${m_str}-${d_str}`;
                }
            }

            // Collect individual employee data
            const personnelNumber = String(row['Pers.No.'] || row['Pers No.'] || row['Personnel Number'] || row['Persno'] || row['persno'] || '').trim();
            const employeeName = String(row['Employee Name'] || row['Name'] || row['Full Name'] || '').trim().toLowerCase();
            const mandorCode = String(row['Kode Mandor'] || '').trim();
            const nameMatches = masterByName.get(employeeName) || [];
            const mandorMatches = masterByMandor.get(mandorCode) || [];
            const mandorPairs = new Set(mandorMatches.map(item => `${item.Choice}|${item.Subdep}`));
            const masterRow = masterByPersonnel.get(personnelNumber)
                || (nameMatches.length === 1 ? nameMatches[0] : undefined)
                || (mandorPairs.size === 1 ? mandorMatches[0] : undefined);
            
            // Hapus spasi ganda dan spasi di ujung agar terhindar dari duplikat
            const masterDepartment = String(masterRow?.Subdep || '')
                .replace(/\s+/g, ' ')
                .trim();
                
            const masterChoice = String(masterRow?.Choice || '').trim();

            let komoditi: string;
            let bagian: string;

            if (masterChoice) {
                // Pakai Choice dari EXPORT3.xlsx sebagai komoditi
                komoditi = masterChoice;
            } else {
                // Fallback: derive dari SAP columns
                komoditi = getKomoditiAndBagian(row).komoditi;
            }

            if (masterDepartment) {
                // Pakai Subdep dari EXPORT3.xlsx sebagai bagian
                bagian = masterDepartment;
            } else {
                // Fallback: derive dari SAP columns
                bagian = getKomoditiAndBagian(row).bagian;
            }

            // OVERRIDE: Pisahkan QC Processed Pineapple, Harvesting & Transport, dan Warehouse dari PG2, dan gabung semua variasi Planting
            if (komoditi === 'PG2') {
                const bagianLow = bagian.toLowerCase();
                if (bagianLow.includes('qc processed')) {
                    komoditi = 'QCPP';
                } else if (bagianLow.includes('harvesting & transport')) {
                    komoditi = 'Harvesting & Transport';
                } else if (bagianLow.includes('warehouse')) {
                    komoditi = 'Warehouse';
                } else if (bagianLow.includes('planting')) {
                    bagian = 'Planting PG2';
                }
            }
            const kitMandor = String(masterRow?.['Kode Mandor'] || row['Kode Mandor'] || '').trim();
            const mappedMandor = mandorMap[kitMandor] || {};

            employeeRecords.push({
                nama_desa: normalizedDesa,
                kecamatan: district,
                employee_name: row['Employee Name'] || row['Name'] || row['Full Name'] || 'Unknown',
                gender,
                street_address: rawAddr || '',
                employment_status: status,
                age: age,
                birth_date: formattedBirthDate,
                komoditi,
                bagian,
                kit_tk: personnelNumber,
                kit_mandor: kitMandor,
                nama_mandor: masterRow?.['Nama Mandor'] || mappedMandor.nama_mandor || '-',
                kasi: secondaryKasieMap.get(personnelNumber) || masterRow?.Kasie || mappedMandor.kasi || '-',
                indeks_tk: personnelNumber || '-',
            });
        }

        if (totalHc === 0) {
            return NextResponse.json({ error: 'No valid data found in Excel file.' }, { status: 400 });
        }

        // Apply threshold < 20 for "Desa Lainnya (< 20 TK)"
        const finalCounts: Record<string, { count: number; district: string; isGrouped: boolean; laki: number; perempuan: number }> = {};
        
        for (const [desa, data] of Object.entries(villageCounts)) {
            if (data.count < 20 || desa.startsWith('Format') || desa.startsWith('Lokasi')) {
                const groupedName = 'Desa Lainnya (< 20 TK)';
                if (!finalCounts[groupedName]) {
                    finalCounts[groupedName] = { count: 0, district: 'Various', isGrouped: true, laki: 0, perempuan: 0 };
                }
                finalCounts[groupedName].count += data.count;
                finalCounts[groupedName].laki += data.laki;
                finalCounts[groupedName].perempuan += data.perempuan;
            } else {
                finalCounts[desa] = { count: data.count, district: data.district, isGrouped: false, laki: data.laki, perempuan: data.perempuan };
            }
        }

        // Check for existing uploads in the same month and year
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

        const { data: existingUploads, error: checkError } = await supabase
            .from('upload_logs')
            .select('id')
            .gte('uploaded_at', startOfMonth)
            .lte('uploaded_at', endOfMonth);

        if (!checkError && existingUploads && existingUploads.length > 0) {
            const idsToDelete = existingUploads.map(u => u.id);
            
            // Delete related records manually to be safe (if no cascade)
            await supabase.from('employee_domisili').delete().in('upload_id', idsToDelete);
            await supabase.from('summary_domisili').delete().in('upload_id', idsToDelete);
            
            // Delete the upload logs
            await supabase.from('upload_logs').delete().in('id', idsToDelete);
        }

        // Insert into upload_logs
        const { data: uploadLog, error: uploadError } = await supabase
            .from('upload_logs')
            .insert({
                filename: file.name,
                total_hc: totalHc,
                uploaded_by: 'System Admin'
            })
            .select()
            .single();

        if (uploadError || !uploadLog) {
            throw new Error(`Failed to create upload log: ${uploadError?.message}`);
        }

        const uploadId = uploadLog.id;

        // Prepare data for summary_domisili
        const summaryData = Object.entries(finalCounts).map(([desa, data]) => {
            const persentase = ((data.count / totalHc) * 100).toFixed(2);
            return {
                upload_id: uploadId,
                nama_desa: desa,
                kecamatan: data.district,
                jumlah_tk: data.count,
                persentase: parseFloat(persentase),
                is_grouped: data.isGrouped,
                jumlah_laki: data.laki,
                jumlah_perempuan: data.perempuan,
            };
        });

        // Bulk insert into summary_domisili
        const { error: summaryError } = await supabase
            .from('summary_domisili')
            .insert(summaryData);

        if (summaryError) {
            throw new Error(`Failed to insert summary data: ${summaryError?.message}`);
        }

        // Prepare and insert employee data
        const employeeDataToInsert = employeeRecords.map(emp => ({
            ...emp,
            upload_id: uploadId
        }));

        // Batch insert in chunks of 1000
        const CHUNK_SIZE = 1000;
        for (let i = 0; i < employeeDataToInsert.length; i += CHUNK_SIZE) {
            const chunk = employeeDataToInsert.slice(i, i + CHUNK_SIZE);
            const { error: empError } = await supabase
                .from('employee_domisili')
                .insert(chunk);
            if (empError) {
                console.error('Failed to insert employee chunk:', empError);
                throw new Error(`Failed to insert employee data: ${empError?.message}`);
            }
        }

        return NextResponse.json({ 
            message: 'Data successfully processed', 
            totalHc, 
            uploadId 
        });

    } catch (error: any) {
        console.error('Error processing upload:', error);
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
