import { BookingError } from './booking';
export function fail(e:unknown):Response{
 if(e instanceof BookingError)return Response.json({message:e.message},{status:e.status,headers:{'Cache-Control':'no-store'}});
 console.error('[bookings] request failed:',e instanceof Error?e.name:'Unknown error');
 return Response.json({message:'Service temporarily unavailable.'},{status:500,headers:{'Cache-Control':'no-store'}});
}
export function safeSlug(slug:string){if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)||slug.length>70)throw new BookingError('Invalid business URL.');return slug;}
export function safeName(name:unknown,max=140){if(typeof name!=='string'||name.trim().length<1||name.trim().length>max)throw new BookingError('Invalid name.');return name.trim();}
export const noCache={'Cache-Control':'no-store'};
