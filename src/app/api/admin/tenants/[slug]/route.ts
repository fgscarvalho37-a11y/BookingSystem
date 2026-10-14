import {checkAdmin} from '@/lib/admin';
import {sql} from '@/lib/db';
import {fail,safeName,safeSlug} from '@/lib/http';
import {BookingError} from '@/lib/booking';
import type {Tenant} from '@/lib/types';
export async function PATCH(req:Request,{params}:{params:Promise<{slug:string}>}){
 const check=await checkAdmin();if(check)return check;
 try{
 const origin=req.headers.get('origin');if(origin&&new URL(origin).origin!==new URL(req.url).origin)throw new BookingError('Invalid origin.',403);
 const slug=safeSlug((await params).slug),b=await req.json();
 const zones=['America/New_York','America/Chicago','America/Denver','America/Phoenix','America/Los_Angeles','America/Anchorage','Pacific/Honolulu'];
 if(!zones.includes(b.timezone))throw new BookingError('Choose a US time zone.');
 if(!['classic','minimal','bold'].includes(b.theme_preset))throw new BookingError('Select a valid website design.');
 if(!/^#[0-9a-fA-F]{6}$/.test(b.accent))throw new BookingError('Invalid accent color.');
 if(!/^\d\d:\d\d$/.test(b.opens_at)||!/^\d\d:\d\d$/.test(b.closes_at)||b.opens_at>=b.closes_at)throw new BookingError('Invalid business hours.');
 if(!Array.isArray(b.weekdays)||!b.weekdays.every((x:unknown)=>Number.isInteger(x)&&Number(x)>=1&&Number(x)<=7))throw new BookingError('Invalid weekdays.');
 const product=b.orbitta_product_id==null||b.orbitta_product_id===''?null:Number(b.orbitta_product_id);
 if(product!==null&&(!Number.isSafeInteger(product)||product<=0))throw new BookingError('Invalid Orbitta contract ID.');
 const trial=b.trial_until?new Date(b.trial_until):null;
 if(trial&&(!Number.isFinite(trial.getTime())||trial.getTime()>Date.now()+14*86400000))throw new BookingError('Test access may not exceed 14 days.');
 const row=await sql<Tenant>(`UPDATE booking_tenants SET name=$2,tagline=$3,description=$4,accent=$5,hero_image=$6,timezone=$7,
 opens_at=$8,closes_at=$9,weekdays=$10,orbitta_product_id=$11,trial_until=$12,published=$13,theme_preset=$14 WHERE slug=$1 RETURNING *`,
 [slug,safeName(b.name),String(b.tagline||'').slice(0,220),String(b.description||'').slice(0,700),b.accent,String(b.hero_image||'').slice(0,1000),b.timezone,b.opens_at,b.closes_at,b.weekdays,product,trial?trial.toISOString():null,Boolean(b.published),b.theme_preset]);
 if(!row[0])throw new BookingError('Business not found.',404);return Response.json(row[0]);
 }catch(e){return fail(e)}
}
