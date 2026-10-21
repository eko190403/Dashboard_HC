export interface DashboardData {
    totalHc: number;
    unknownDomicileCount: number | null;
    diffHc: number;
    diffPercent: number;
    previousUploadDate: string | null;
    totalVillages: number;
    dominantDistrict: { name: string; percentage: number };
    lastUpdated: string;
    villageData: VillageSummary[];
    districtData: DistrictSummary[];
}

export interface VillageSummary {
    id?: string | number;
    nama_desa: string;
    kecamatan: string;
    kabupaten?: string | null;
    jumlah_tk: number;
    persentase: number;
    is_grouped?: boolean;
    jumlah_laki?: number;
    jumlah_perempuan?: number;
}

export interface DistrictSummary {
    name: string;
    value: number;
}

export interface UploadOption {
    id: string | number;
    uploaded_at: string;
}
