import { activeTenant,availableSlots,tenantServices,BookingError } from '@/lib/booking';
import { fail,noCache } from '@/lib/http';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}){
 try{const {slug}=await params;const url=new URL(request.url),date=url.searchParams.get('date')||'',serviceId=url.searchParams.get('serviceId');
  const tenant=await activeTenant(slug),service=(await tenantServices(tenant.id)).find(s=>s.id===serviceId);
  if(!service)throw new BookingError('Service not found.',404);
  return Response.json(await availableSlots(tenant,service,date),{headers:noCache});
 }catch(e){return fail(e)}
}
