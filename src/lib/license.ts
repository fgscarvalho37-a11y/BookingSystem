import type { Tenant } from './types';
export type AccessResult={active:boolean;temporary:boolean};
// Checks happen on the server for EACH request. A direct POST cannot bypass suspension.
export async function getAccess(tenant:Tenant):Promise<AccessResult>{
 if(!tenant.published)return {active:false,temporary:false};
 if(tenant.orbitta_product_id==null){
   const trial=tenant.trial_until ? new Date(tenant.trial_until).getTime() : 0;
   return {active:trial>Date.now(),temporary:false};
 }
 const url=process.env.ORBITTA_LICENSE_URL;
 const token=process.env.ORBITTA_LICENSE_TOKEN;
 if(!url||!token)return {active:false,temporary:true}; // Never grant paid access without billing connection.
 try{
  const base=new URL(url);if(base.protocol!=='https:' && process.env.NODE_ENV==='production')return {active:false,temporary:true};
  const result=await fetch(url.replace(/\/$/,'')+'/'+tenant.orbitta_product_id,{headers:{'X-Orbitta-Bookings-Key':token},cache:'no-store',signal:AbortSignal.timeout(5000)});
  if(!result.ok)return {active:false,temporary:true};
  const json=await result.json() as {active?:boolean};
  return {active:json.active===true,temporary:false};
 }catch{return {active:false,temporary:true};}
}
export function blockResponse(access:AccessResult):Response {
 return Response.json({message:access.temporary?'Booking temporarily unavailable. Please try again.':'This business is not accepting online bookings.'},{status:access.temporary?503:403,headers:{'Cache-Control':'no-store'}});
}
