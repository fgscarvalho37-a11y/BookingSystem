import {checkAdmin} from '@/lib/admin';
import {tenantBySlug,BookingError} from '@/lib/booking';
import {frameDocument} from '@/lib/zip';
import {fail} from '@/lib/http';
export const dynamic='force-dynamic';
export async function GET(_req:Request,{params}:{params:Promise<{slug:string}>}){
 const auth=await checkAdmin();if(auth)return auth;
 try{
  const tenant=await tenantBySlug((await params).slug);
  if(!tenant?.theme_html)throw new BookingError('No custom theme.',404);
  const html=frameDocument(tenant.theme_html,tenant.theme_css||'',tenant.theme_js||'');
  return new Response(html,{headers:{
    'Content-Type':'text/html; charset=utf-8',
    'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',
    'Content-Security-Policy':"sandbox allow-scripts; default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; form-action 'none'; connect-src 'none'; base-uri 'none'"
  }});
 }catch(e){return fail(e)}
}
