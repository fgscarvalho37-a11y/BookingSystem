import {validPassword,setAdminCookie} from '@/lib/admin';
import {BookingError} from '@/lib/booking';
import {fail} from '@/lib/http';
export async function POST(request:Request){try{
 const origin=request.headers.get('origin');if(origin&&new URL(origin).origin!==new URL(request.url).origin)throw new BookingError('Invalid origin.',403);
 const {password}=await request.json();if(typeof password!=='string'||!validPassword(password))throw new BookingError('Invalid password.',401);
 await setAdminCookie();return Response.json({ok:true},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return fail(e)}}
