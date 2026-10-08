import { NextRequest, NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import { getEmployeeMasterLookups } from '@/lib/employee-master';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { normalizeDesa, normalizeGender } from '@/lib/normalizer';
import { deduplicateRows } from '@/lib/duplicate-check';
import { filterValidUploadRows, getMissingColumns, REQUIRED_UPLOAD_COLUMNS } from '@/lib/upload-validation';

function getKomoditiAndBagian(row: Record<string, unknown>): { komoditi: string; bagian: string } {
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
        const supabaseAdmin = getSupabaseAdmin();

        // Upload original file to Supabase Storage Bucket 'excel-backups' if needed
        // For now, we will process it first
        const filename = `${Date.now()}_${file.name}`;
        
        const { error: storageError } = await supabaseAdmin.storage
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
        const rawData = xlsx.utils.sheet_to_json(sheet) as Record<string, unknown>[];

        if (!rawData.length) {
            return NextResponse.json({ error: 'File Excel kosong atau tidak memiliki data.' }, { status: 400 });
        }

        const sheetKeys = Object.keys(rawData[0] ?? {});
        const missingColumns = getMissingColumns(sheetKeys, REQUIRED_UPLOAD_COLUMNS);

        if (missingColumns.length > 0) {
            return NextResponse.json({
                error: 'File tidak sesuai template. Kolom wajib tidak ditemukan.',
                missingColumns,
                expectedColumns: REQUIRED_UPLOAD_COLUMNS,
            }, { status: 400 });
        }

        const { validRows, invalidRows, skippedNonActive } = filterValidUploadRows(rawData);

        if (validRows.length === 0) {
            return NextResponse.json({
                error: 'Tidak ada data valid yang bisa diproses setelah validasi.',
                invalidRows,
                skippedNonActive,
            }, { status: 400 });
        }

        const { data: deduplicatedData, duplicatesSkipped } = deduplicateRows(validRows);

        if (deduplicatedData.length === 0) {
            return NextResponse.json({
                error: 'Tidak ada data valid yang bisa diproses setelah deduplikasi.',
                invalidRows,
                skippedNonActive,
                duplicatesSkipped,
            }, { status: 400 });
        }

        if (duplicatesSkipped > 0) {
            console.warn(`Duplicate rows skipped during upload: ${duplicatesSkipped}`);
        }

        const { byPersonnel: masterByPersonnel, byName: masterByName, byMandor: masterByMandor } =
            await getEmployeeMasterLookups();

        // Fetch mandor mapping
        const { data: mandorData, error: mandorError } = await getSupabaseAdmin()
            .from('mandor_mapping')
            .select('kit_mandor,nama_mandor,kasi');

        if (mandorError) {
            throw new Error(`Failed to load mandor mapping: ${mandorError.message}`);
        }
            
        const mandorMap: Record<string, Record<string, unknown>> = {};
        if (mandorData) {
            mandorData.forEach(m => {
                mandorMap[m.kit_mandor] = m;
            });
        }

        let totalHc = 0;
        const villageCounts: Record<string, { count: number; district: string; laki: number; perempuan: number }> = {};
        const employeeRecords: Record<string, unknown>[] = [];

        for (const row of deduplicatedData) {
            const rawAddr = row['Street and House Number'];
            const district = String(row['District'] || '');
            const status = String(row['Employment Status'] || '');
            const gender = normalizeGender(String(row['Gender Key'] ?? ''));

            // Skip empty rows if necessary
            if (rawAddr === undefined && district === '') continue;

            // Only count active employees
            if (status && status.toLowerCase() !== 'active') {
                continue;
            }

            const normalizedDesa = normalizeDesa(String(rawAddr ?? ''), district);
            
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
                let birthDate: Date | null = null;
                if (typeof rawBirthDate === 'number') {
                    // Excel stores dates as days since Jan 1, 1900
                    birthDate = new Date((rawBirthDate - 25569) * 86400 * 1000);
                } else if (typeof rawBirthDate === 'string' || typeof rawBirthDate === 'number') {
                    const parsedDate = new Date(rawBirthDate);
                    if (!isNaN(parsedDate.getTime())) {
                        birthDate = parsedDate;
                    }
                }

                if (birthDate && !isNaN(birthDate.getTime())) {
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
            const mandorPairs = new Set(mandorMatches.map(item => `${item.choice}|${item.subdep}`));
            const masterRow = masterByPersonnel.get(personnelNumber)
                || (nameMatches.length === 1 ? nameMatches[0] : undefined)
                || (mandorPairs.size === 1 ? mandorMatches[0] : undefined);
            
            // Hapus spasi ganda dan spasi di ujung agar terhindar dari duplikat
            const masterDepartment = String(masterRow?.subdep || '')
                .replace(/\s+/g, ' ')
                .trim();
                
            const masterChoice = String(masterRow?.choice || '').trim();

            let komoditi: string;
            let bagian: string;

            if (masterChoice) {
                // Use the employee master Choice as the commodity.
                komoditi = masterChoice;
            } else {
                // Fallback: derive dari SAP columns
                komoditi = getKomoditiAndBagian(row).komoditi;
            }

            if (masterDepartment) {
                // Use the employee master Subdep as the department.
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
            const kitMandor = String(masterRow?.mandor_code || row['Kode Mandor'] || '').trim();
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
                nama_mandor: masterRow?.mandor_name || mappedMandor.nama_mandor || '-',
                kasi: masterRow?.kasie || mappedMandor.kasi || '-',
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

        const uploadSummary = {
            duplicatesSkipped,
            invalidRows,
            skippedNonActive,
            validRows: deduplicatedData.length,
            totalRowsRead: rawData.length,
        };

        // Prepare data for summary_domisili
        const summaryData = Object.entries(finalCounts).map(([desa, data]) => {
            const persentase = ((data.count / totalHc) * 100).toFixed(2);
            return {
                nama_desa: desa,
                kecamatan: data.district,
                jumlah_tk: data.count,
                persentase: parseFloat(persentase),
                is_grouped: data.isGrouped,
                jumlah_laki: data.laki,
                jumlah_perempuan: data.perempuan,
            };
        });

        const { data: uploadResult, error: uploadError } = await supabaseAdmin.rpc('replace_monthly_upload', {
            p_filename: file.name,
            p_total_hc: totalHc,
            p_uploaded_by: 'System Admin',
            p_audit_summary: uploadSummary,
            p_summary_data: summaryData,
            p_employee_data: employeeRecords,
        });

        if (uploadError) {
            throw new Error(`Failed to save upload transaction: ${uploadError.message}`);
        }

        const uploadId = (uploadResult as { upload_id?: unknown } | null)?.upload_id;
        if (typeof uploadId !== 'number' && typeof uploadId !== 'string') {
            throw new Error('Upload transaction completed without returning an upload ID.');
        }

        return NextResponse.json({ 
            message: 'Data successfully processed', 
            totalHc,
            uploadId,
            duplicatesSkipped,
            validRows: deduplicatedData.length,
            invalidRows,
            skippedNonActive,
        });

    } catch (error: unknown) {
        console.error('Error processing upload:', error);
        const message = error instanceof Error ? error.message : 'Internal Server Error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
