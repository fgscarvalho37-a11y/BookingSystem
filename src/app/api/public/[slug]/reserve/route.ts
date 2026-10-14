import { reserveSlot,BookingError } from '@/lib/booking';
import { fail,noCache } from '@/lib/http';
export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){
 try{
  if(Number(request.headers.get('content-length')||0)>6000)throw new BookingError('Request too large.',413);
  const {slug}=await params;
  const origin=request.headers.get('origin');
  if(origin&&new URL(origin).origin!==new URL(request.url).origin)throw new BookingError('Invalid request origin.',403);
  const json=await request.json();
  return Response.json(await reserveSlot({slug,...json}),{status:201,headers:noCache});
 }catch(e){return fail(e)}
}
