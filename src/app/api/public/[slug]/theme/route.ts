import { activeTenant,BookingError } from '@/lib/booking';
import { frameDocument } from '@/lib/zip';
import { fail } from '@/lib/http';
export const dynamic='force-dynamic';
export async function GET(_req:Request,{params}:{params:Promise<{slug:string}>}){
 try{const tenant=await activeTenant((await params).slug);if(!tenant.theme_html)throw new BookingError('No uploaded theme.',404);
 const page=frameDocument(tenant.theme_html,tenant.theme_css||'',tenant.theme_js||'');
 return new Response(page,{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox allow-scripts; default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; form-action 'none'; connect-src 'none'; base-uri 'none'"}});
 }catch(e){return fail(e)}
}
