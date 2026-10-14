import {checkAdmin} from '@/lib/admin';
import {sql} from '@/lib/db';
import {fail,safeName,safeSlug} from '@/lib/http';
import {BookingError} from '@/lib/booking';
import type {Service} from '@/lib/types';
export async function GET(_req:Request,{params}:{params:Promise<{slug:string}>}){
 const check=await checkAdmin();if(check)return check;
 try{const slug=safeSlug((await params).slug);return Response.json(await sql<Service>('SELECT s.* FROM booking_services s JOIN booking_tenants t ON t.id=s.tenant_id WHERE t.slug=$1 ORDER BY s.name',[slug]));}catch(e){return fail(e)}
}
export async function POST(req:Request,{params}:{params:Promise<{slug:string}>}){
 const check=await checkAdmin();if(check)return check;
 try{const slug=safeSlug((await params).slug),b=await req.json(),duration=Number(b.duration_min),price=Number(b.price_cents);
 if(!Number.isInteger(duration)||duration<15||duration>480||!Number.isInteger(price)||price<0||price>10000000)throw new BookingError('Invalid service duration or USD price.');
 const row=await sql<Service>(`INSERT INTO booking_services(tenant_id,name,description,price_cents,duration_min)
 SELECT id,$2,$3,$4,$5 FROM booking_tenants WHERE slug=$1 RETURNING *`,[slug,safeName(b.name,120),String(b.description||'').slice(0,300),price,duration]);
 if(!row[0])throw new BookingError('Business not found.',404);return Response.json(row[0],{status:201});
 }catch(e){return fail(e)}
}
