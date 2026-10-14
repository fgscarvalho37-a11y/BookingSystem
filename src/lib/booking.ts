import { DateTime } from 'luxon';
import { sql, transaction } from './db';
import { getAccess } from './license';
import type { Tenant, Service, Appointment, Slot } from './types';

export class BookingError extends Error { constructor(message:string,public status:number=400){super(message);} }
export function asPublic(tenant:Tenant){return {slug:tenant.slug,name:tenant.name,tagline:tenant.tagline,description:tenant.description,accent:tenant.accent,hero_image:tenant.hero_image,timezone:tenant.timezone,opens_at:tenant.opens_at,closes_at:tenant.closes_at,weekdays:tenant.weekdays,customTheme:!!tenant.theme_html};}
export async function tenantBySlug(slug:string):Promise<Tenant|null>{if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))return null;return (await sql<Tenant>('SELECT * FROM booking_tenants WHERE slug=$1',[slug]))[0]||null;}
export async function tenantServices(id:string):Promise<Service[]>{return sql<Service>('SELECT * FROM booking_services WHERE tenant_id=$1 AND enabled=true ORDER BY name',[id]);}
export async function activeTenant(slug:string){
 const tenant=await tenantBySlug(slug); if(!tenant)throw new BookingError('Page not found.',404);
 const access=await getAccess(tenant);if(!access.active)throw new BookingError(access.temporary?'Billing status temporarily unavailable.':'Online booking is unavailable.',access.temporary?503:403);
 return tenant;
}
export async function availableSlots(tenant:Tenant,service:Service,date:string,query?:(s:string,p:unknown[])=>Promise<Appointment[]>):Promise<Slot[]>{
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new BookingError('Use YYYY-MM-DD.');
 const start=DateTime.fromISO(date,{zone:tenant.timezone});
 if(!start.isValid||start.toISODate()!==date)throw new BookingError('Invalid date.');
 if(start.startOf('day')<DateTime.now().setZone(tenant.timezone).startOf('day')||start> DateTime.now().setZone(tenant.timezone).plus({days:120}))return [];
 if(!tenant.weekdays.includes(start.weekday))return [];
 const [oh,om]=tenant.opens_at.slice(0,5).split(':').map(Number),[ch,cm]=tenant.closes_at.slice(0,5).split(':').map(Number);
 if([oh,om,ch,cm].some(x=>!Number.isFinite(x)))return [];
 const open=start.set({hour:oh,minute:om}),close=start.set({hour:ch,minute:cm});
 if(close<=open)return [];
 const read = query || (async (s:string,p:unknown[]) => sql<Appointment>(s,p));
 const appointments=await read('SELECT * FROM booking_appointments WHERE tenant_id=$1 AND status=$2 AND start_at<$3 AND end_at>$4',
   [tenant.id,'CONFIRMED',close.toUTC().toISO(),open.toUTC().toISO()]);
 const result:Slot[]=[];
 for(let time=open;time.plus({minutes:service.duration_min})<=close;time=time.plus({minutes:30})){
  if(time.toMillis()<Date.now()+60*60*1000)continue;
  const end=time.plus({minutes:service.duration_min});
  if(appointments.some(a=>new Date(a.start_at).getTime()<end.toMillis()&&new Date(a.end_at).getTime()>time.toMillis()))continue;
  result.push({start:time.toUTC().toISO()!,label:time.toFormat('h:mm a')});
 }
 return result;
}
export async function reserveSlot(input:{slug:string;serviceId:string;start:string;name:string;email:string;phone:string;website?:string}){
 if(input.website)throw new BookingError('Unable to book.',400);
 const name=input.name?.trim(), email=input.email?.trim().toLowerCase(), phone=input.phone?.trim();
 if(!name||name.length>90||!email||email.length>200||!/^\S+@\S+\.\S+$/.test(email)||!phone||phone.length>30||!/^\+?[0-9() .-]{7,30}$/.test(phone))throw new BookingError('Please enter valid contact details.');
 if(!/^[0-9a-f-]{36}$/i.test(input.serviceId))throw new BookingError('Invalid service.');
 const start=DateTime.fromISO(input.start,{setZone:true});if(!start.isValid||!input.start.includes('Z'))throw new BookingError('Invalid time.');
 return transaction(async(client)=>{
  // All bookings for a business/day acquire the same transaction lock before availability re-check.
  const tenant=await tenantBySlug(input.slug);if(!tenant)throw new BookingError('Page not found.',404);
  const access=await getAccess(tenant);if(!access.active)throw new BookingError('Booking is unavailable.',access.temporary?503:403);
  const localDay=start.setZone(tenant.timezone).toISODate()!;
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[tenant.id+':'+localDay]);
  const row=await client.query<Service>('SELECT * FROM booking_services WHERE id=$1 AND tenant_id=$2 AND enabled=true',[input.serviceId,tenant.id]);
  const service=row.rows[0];if(!service)throw new BookingError('Invalid service.',404);
  const query=async(s:string,p:unknown[])=> (await client.query<Appointment>(s,p)).rows;
  const available=await availableSlots(tenant,service,localDay,query);
  if(!available.some(v=>v.start===start.toUTC().toISO()))throw new BookingError('That time is no longer available. Please select another.',409);
  const result=await client.query<{id:string}>('INSERT INTO booking_appointments(tenant_id,service_id,start_at,end_at,customer_name,customer_email,customer_phone) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',
   [tenant.id,service.id,start.toUTC().toISO(),start.plus({minutes:service.duration_min}).toUTC().toISO(),name,email,phone]);
  return {reference:result.rows[0].id,service:service.name,when:start.setZone(tenant.timezone).toFormat('cccc, LLL d, yyyy · h:mm a'),business:tenant.name};
 });
}
