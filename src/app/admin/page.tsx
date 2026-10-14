import AdminPanel from '@/components/AdminPanel';
import { signedIn } from '@/lib/admin';
export const dynamic='force-dynamic';
export default async function Admin(){return <AdminPanel initiallySignedIn={await signedIn()}/>;}
