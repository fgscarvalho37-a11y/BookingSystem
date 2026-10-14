import BookingPage from '@/components/BookingPage';
import { signedIn } from '@/lib/admin';
import { tenantBySlug,tenantServices,asPublic } from '@/lib/booking';
import { redirect, notFound } from 'next/navigation';

export const dynamic='force-dynamic';
export default async function PrivatePreview({params}:{params:Promise<{slug:string}>}){
 if(!(await signedIn()))redirect('/admin');
 const {slug}=await params;
 const tenant=await tenantBySlug(slug);
 if(!tenant)notFound();
 const services=await tenantServices(tenant.id);
 return <BookingPage business={{...asPublic(tenant),customTheme:Boolean(tenant.theme_draft_html??tenant.theme_html)}} services={services} demo/>;
}
