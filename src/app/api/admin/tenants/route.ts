import {checkAdmin} from '@/lib/admin';
import {sql} from '@/lib/db';
import {fail,safeName,safeSlug,noCache} from '@/lib/http';
import {BookingError} from '@/lib/booking';
import type {Tenant} from '@/lib/types';
export const dynamic='force-dynamic';
export async function GET(){const auth=await checkAdmin();if(auth)return auth;try{return Response.json(await sql<Tenant>('SELECT * FROM booking_tenants ORDER BY created_at DESC'),{headers:noCache})}catch(e){return fail(e)}}
export async function POST(request:Request){const auth=await checkAdmin();if(auth)return auth;
 try{
 const origin=request.headers.get('origin');if(origin&&new URL(origin).origin!==new URL(request.url).origin)throw new BookingError('Invalid origin.',403);
 const body=await request.json();const slug=safeSlug(String(body.slug||'')),name=safeName(body.name);
 const validZones=['America/New_York','America/Chicago','America/Denver','America/Phoenix','America/Los_Angeles','America/Anchorage','Pacific/Honolulu'];
 const zone=validZones.includes(body.timezone)?body.timezone:'America/New_York';
 const row=await sql<Tenant>('INSERT INTO booking_tenants(slug,name,timezone) VALUES ($1,$2,$3) RETURNING *',[slug,name,zone]);
 return Response.json(row[0],{status:201,headers:noCache});
 }catch(e){return fail(e)}}
