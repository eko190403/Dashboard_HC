export const ALIAS_MAP: Record<string, string> = {
    // Gunung Sari
    'gunung sari': 'Gunung Sari',
    'gn. sari': 'Gunung Sari',
    'gn sari': 'Gunung Sari',
    'gngsari': 'Gunung Sari',

    // Rejo Mulyo
    'rejo mulyo': 'Rejo Mulyo',
    'rejomulyo': 'Rejo Mulyo',
    'rejo muliyo': 'Rejo Mulyo',

    // Gunung Menanti
    'gunung menanti': 'Gunung Menanti',
    'gn menanti': 'Gunung Menanti',
    'gn. menanti': 'Gunung Menanti',

    // Gunung Kramat (termasuk variasi keramat)
    'gunung kramat': 'Gunung Kramat',
    'gunung keramat': 'Gunung Kramat',
    'gn kramat': 'Gunung Kramat',
    'gn. kramat': 'Gunung Kramat',
    'gn keramat': 'Gunung Kramat',
    'gn. keramat': 'Gunung Kramat',

    // Sido Rahayu
    'sido rahayu': 'Sido Rahayu',
    'sidorahayu': 'Sido Rahayu',
    'sidorahayau': 'Sido Rahayu',
    'sido rahaju': 'Sido Rahayu',
    'campang': 'Sido Rahayu',  // per spec

    // Bumi Raharja
    'bumi raharja': 'Bumi Raharja',
    'bumiraharja': 'Bumi Raharja',
    'bumi raharjo': 'Bumi Raharja',

    // Bumiharja
    'bumi harja': 'Bumiharja',
    'bumiharja': 'Bumiharja',

    // Gunung Agung
    'gunung agung': 'Gunung Agung',
    'gunung angung': 'Gunung Agung',
    'gn agung': 'Gunung Agung',
    'gn. agung': 'Gunung Agung',

    // Bumi Jaya
    'bumi jaya': 'Bumi Jaya',
    'bumijaya': 'Bumi Jaya',
    'bumi jaya i': 'Bumi Jaya',

    // Papan Asri
    'papan asri': 'Papan Asri',
    'papanasri': 'Papan Asri',

    // Banjar Kertahayu
    'banjar kertahayu': 'Banjar Kertahayu',
    'banjar kerta rahayu': 'Banjar Kertahayu',
    'banjarkertahayu': 'Banjar Kertahayu',
    'banjar ke': 'Banjar Kertahayu',

    // Bumi Restu
    'bumi restu': 'Bumi Restu',
    'bumirestu': 'Bumi Restu',

    // Sukoharjo
    'sukoharjo': 'Sukoharjo',

    // Lempuyang Bandar
    'lempuyang bandar': 'Lempuyang Bandar',
    'lempuyangbandar': 'Lempuyang Bandar',
    'lempunyang bandar': 'Lempuyang Bandar',
    'lempuang bandar': 'Lempuyang Bandar',

    // Buring Kencana
    'buring kencana': 'Buring Kencana',
    'buringkencana': 'Buring Kencana',

    // Bandar Sakti
    'bandar sakti': 'Bandar Sakti',
    'bandarsakti': 'Bandar Sakti',

    // Banjar Ratu
    'banjar ratu': 'Banjar Ratu',
    'banjarratu': 'Banjar Ratu',

    // Purba Sakti
    'purba sakti': 'Purba Sakti',
    'purbasakti': 'Purba Sakti',

    // Margodadi
    'margodadi': 'Margodadi',
    'margo dadi': 'Margodadi',

    // Terbanggi Besar
    'terbanggi besar': 'Terbanggi Besar',
    'terbanggia besar': 'Terbanggi Besar',
    'terbanggibesar': 'Terbanggi Besar',

    // Terusan Nunyai
    'terusan nunyai': 'Terusan Nunyai',
    'terusannunyai': 'Terusan Nunyai',

    // Gunung Batin Udik
    'gunung batin udik': 'Gunung Batin Udik',
    'gunung batu udik': 'Gunung Batin Udik',
    'gn batin udik': 'Gunung Batin Udik',

    // Talang Dua
    'talang dua': 'Talang Dua',
    'talangdua': 'Talang Dua',

    // Buring Jaya
    'buring jaya': 'Buring Jaya',
    'buringjaya': 'Buring Jaya',

    // Talang Harapan
    'talang harapan': 'Talang Harapan',
    'talangharapan': 'Talang Harapan',

    // Bandar Sari
    'bandar sari': 'Bandar Sari',
    'bandarsari': 'Bandar Sari',

    // Talang Maju
    'talang maju': 'Talang Maju',
    'talangmaju': 'Talang Maju',

    // Semuli Raya
    'semuli raya': 'Semuli Raya',
    'semuliraya': 'Semuli Raya',

    // Jaya Bakti
    'jaya bakti': 'Jaya Bakti',
    'jaya bhakti': 'Jaya Bakti',
    'jayabakti': 'Jaya Bakti',

    // Candi Rejo
    'candi rejo': 'Candi Rejo',
    'candirejo': 'Candi Rejo',

    // Sumber Rejo
    'sumber rejo': 'Sumber Rejo',
    'sumberrejo': 'Sumber Rejo',
};

const ALIAS_KEYS = Object.keys(ALIAS_MAP).sort((a, b) => b.length - a.length);

const SEPARATOR_PATTERN = /\b(?:rt\/?rw|rt|rw|dusun|dsn|dsn\.|jl\.|jalan|kp\.|kampung|kel\.|kec\.|kab\.|desa)\b/i;

const COMPANY_KEYWORDS = ['perum op', 'perum kopkar', 'pt ggp', 'pg 2', 'pg2', 'mess', 'kost', 'komp.', 'asrama', 'perumahan pt', 'perumahan ggp', 'kopkar'];

export function normalizeDesa(rawAddr: string, district: string): string {
    rawAddr = (rawAddr || '').toString().trim();
    district = (district || '').toString().trim();

    if (!rawAddr || ['-', '.', '', '0'].includes(rawAddr)) {
        return district ? toTitleCase(district) : 'Tidak Diketahui';
    }

    const addrLower = rawAddr.toLowerCase();

    // 1. Check company location
    for (const kw of COMPANY_KEYWORDS) {
        if (addrLower.includes(kw)) {
            return 'Lokasi Perusahaan / Mess';
        }
    }

    // 2. Direct alias mapping
    for (const key of ALIAS_KEYS) {
        if (addrLower.includes(key)) {
            return ALIAS_MAP[key];
        }
    }

    // 3. Regex parsing
    const parts = rawAddr.split(SEPARATOR_PATTERN);
    const candidates: string[] = [];
    
    for (let part of parts) {
        part = part.trim().replace(/^,+|,+$/g, '').trim();
        // Remove numbers/symbols at start
        part = part.replace(/^[\d\s/.,;:-]+/, '').trim();
        if (part.length >= 3 && /[a-zA-Z]{3}/.test(part)) {
            candidates.push(part);
        }
    }

    if (candidates.length > 0) {
        let best = candidates[0].replace(/^,+|,+$/g, '').trim();
        best = toTitleCase(best);
        
        // Check alias again on best match
        for (const key of ALIAS_KEYS) {
            if (best.toLowerCase().includes(key)) {
                return ALIAS_MAP[key];
            }
        }
        return best;
    }

    // 4. Fallback to district
    if (district) {
        return toTitleCase(district);
    }

    return 'Tidak Diketahui';
}

export function normalizeGender(value: unknown): 'L' | 'P' | '' {
    const gender = String(value || '').trim().toLowerCase();
    if (['l', 'male', 'laki-laki', 'laki laki', 'pria'].includes(gender)) return 'L';
    if (['p', 'female', 'perempuan', 'wanita'].includes(gender)) return 'P';
    return '';
}

export function normalizeKabupaten(value: unknown): string {
    const normalized = String(value || '')
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[.,;:]+$/, '')
        .toLocaleLowerCase('id-ID');
    if (!normalized) return 'Tidak Diketahui';

    const aliases: Record<string, string> = {
        'bandar lampung': 'Kota Bandar Lampung',
        'kota bandar lampung': 'Kota Bandar Lampung',
        'bandar lampung kota': 'Kota Bandar Lampung',
        'bandar lampung kota bandar lampung': 'Kota Bandar Lampung',
        'metro': 'Kota Metro',
        'kota metro': 'Kota Metro',
        'lampung tengahl': 'Lampung Tengah',
        'tulan bawang barat': 'Tulang Bawang Barat',
    };

    return aliases[normalized] || toTitleCase(normalized);
}

export function normalizeKecamatan(value: unknown): string {
    const normalized = String(value ?? '')
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[.,;:]+$/, '')
        .toLocaleLowerCase('id-ID');
    if (!normalized) return '';

    const aliases: Record<string, string> = {
        'anat tuha': 'Anak Tuha',
        'blambang pagar': 'Blambangan Pagar',
        'bumiratu nuban': 'Bumi Ratu Nuban',
        'cileunsi': 'Cileungsi',
        'gedung tataan': 'Gedong Tataan',
        'kota bumi': 'Kotabumi',
        kotabumi: 'Kotabumi',
        'suko harjo': 'Sukoharjo',
        'terbanggi besarl': 'Terbanggi Besar',
        'terusan nyunyai': 'Terusan Nunyai',
        'tulang bawang udki': 'Tulang Bawang Udik',
        'tulang bwang tengah': 'Tulang Bawang Tengah',
        'tumi jajar': 'Tumijajar',
        tumijajar: 'Tumijajar',
        'way pangubuan': 'Way Pengubuan',
        'way pengubuhan': 'Way Pengubuan',
        'way ppengubuan': 'Way Pengubuan',
    };

    return aliases[normalized] || toTitleCase(normalized);
}

function toTitleCase(str: string): string {
    return str.replace(
        /\w\S*/g,
        function(txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        }
    );
}
