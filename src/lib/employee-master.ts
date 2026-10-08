import 'server-only';

import { getSupabaseAdmin } from '@/lib/supabase-admin';

const PAGE_SIZE = 1000;
const EMPLOYEE_MASTER_COLUMNS =
    'personnel_number,full_name,mandor_code,mandor_name,kasie,choice,subdep';

export type EmployeeMasterRecord = {
    personnel_number: string;
    full_name: string | null;
    mandor_code: string | null;
    mandor_name: string | null;
    kasie: string | null;
    choice: string | null;
    subdep: string | null;
};

export type EmployeeMasterLookups = {
    byPersonnel: Map<string, EmployeeMasterRecord>;
    byName: Map<string, EmployeeMasterRecord[]>;
    byMandor: Map<string, EmployeeMasterRecord[]>;
};

export async function getEmployeeMasterLookups(): Promise<EmployeeMasterLookups> {
    const supabaseAdmin = getSupabaseAdmin();
    const rows: EmployeeMasterRecord[] = [];

    for (let offset = 0; ; offset += PAGE_SIZE) {
        const { data, error } = await supabaseAdmin
            .from('employee_master')
            .select(EMPLOYEE_MASTER_COLUMNS)
            .order('personnel_number', { ascending: true })
            .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
            throw new Error(`Failed to load employee master: ${error.message}`);
        }

        rows.push(...(data ?? []) as EmployeeMasterRecord[]);
        if (!data || data.length < PAGE_SIZE) break;
    }

    if (rows.length === 0) {
        throw new Error('Employee master is empty. Import the master data into employee_master before uploading.');
    }

    const byPersonnel = new Map<string, EmployeeMasterRecord>();
    const byName = new Map<string, EmployeeMasterRecord[]>();
    const byMandor = new Map<string, EmployeeMasterRecord[]>();

    for (const row of rows) {
        const personnelNumber = String(row.personnel_number ?? '').trim();
        const name = String(row.full_name ?? '').trim().toLowerCase();
        const mandorCode = String(row.mandor_code ?? '').trim();

        if (personnelNumber) byPersonnel.set(personnelNumber, row);
        if (name) byName.set(name, [...(byName.get(name) ?? []), row]);
        if (mandorCode && mandorCode !== '0') {
            byMandor.set(mandorCode, [...(byMandor.get(mandorCode) ?? []), row]);
        }
    }

    return { byPersonnel, byName, byMandor };
}
