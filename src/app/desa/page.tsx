import { redirect } from 'next/navigation';

// /desa tanpa parameter langsung redirect ke tk-detail
export default function DesaIndexPage() {
    redirect('/tk-detail?komoditi=Semua');
}
