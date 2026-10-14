import BookingPage from '@/components/BookingPage';
import { tenantBySlug,tenantServices,asPublic } from '@/lib/booking';
import { getAccess } from '@/lib/license';
import { notFound } from 'next/navigation';
export const dynamic='force-dynamic';
export default async function TenantPage({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 let tenant;try{tenant=await tenantBySlug(slug);}catch{return <Unavailable temporary/>;}
 if(!tenant)notFound();
 const access=await getAccess(tenant);
 if(!access.active)return <Unavailable temporary={access.temporary}/>;
 const services=await tenantServices(tenant.id);
 return <BookingPage business={asPublic(tenant)} services={services}/>;
}
function Unavailable({temporary=false}:{temporary?:boolean}){return <div className="unavailable"><div className="brand-mark">✳</div><h1>{temporary?'We’ll be back shortly.':'Online booking is temporarily unavailable.'}</h1><p>{temporary?'Please try again in a few minutes.':'Please contact the business directly for appointments.'}</p><span>Powered by Orbitta</span></div>}
