import {checkAdmin} from '@/lib/admin';
import {sql} from '@/lib/db';
import {fail,safeSlug} from '@/lib/http';
import {BookingError} from '@/lib/booking';
import type {Appointment} from '@/lib/types';
export async function GET(req:Request,{params}:{params:Promise<{slug:string}>}){
 const check=await checkAdmin();if(check)return check;
 try{const slug=safeSlug((await params).slug);
 return Response.json(await sql<Appointment>(`SELECT a.*,s.name FROM booking_appointments a JOIN booking_tenants t ON t.id=a.tenant_id JOIN booking_services s ON s.id=a.service_id WHERE t.slug=$1 AND a.start_at>=now()-interval '30 days' ORDER BY a.start_at DESC LIMIT 200`,[slug]),{headers:{'Cache-Control':'no-store'}});
 }catch(e){return fail(e)}
}
export async function PATCH(req:Request,{params}:{params:Promise<{slug:string}>}){
 const check=await checkAdmin();if(check)return check;
 try{const slug=safeSlug((await params).slug),body=await req.json();
 if(!['CONFIRMED','CANCELLED','COMPLETED'].includes(body.status))throw new BookingError('Invalid status.');
 if(!/^[0-9a-f-]{36}$/i.test(String(body.id)))throw new BookingError('Invalid ID.');
 const row=await sql<Appointment>(`UPDATE booking_appointments a SET status=$3 FROM booking_tenants t WHERE a.tenant_id=t.id AND t.slug=$1 AND a.id=$2 AND NOT(a.status='CANCELLED' AND $3='CONFIRMED') RETURNING a.*`,[slug,body.id,body.status]);
 if(!row[0])throw new BookingError('Appointment not found or cannot be reactivated.',404);return Response.json(row[0]);
 }catch(e){return fail(e)}
}
