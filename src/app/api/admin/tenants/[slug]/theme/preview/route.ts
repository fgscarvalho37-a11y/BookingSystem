import {checkAdmin} from '@/lib/admin';
import {tenantBySlug,BookingError} from '@/lib/booking';
import {frameDocument} from '@/lib/zip';
import {fail} from '@/lib/http';
export const dynamic='force-dynamic';
export async function GET(_req:Request,{params}:{params:Promise<{slug:string}>}){
 const auth=await checkAdmin();if(auth)return auth;
 try{
  const tenant=await tenantBySlug((await params).slug);
  if(!tenant)throw new BookingError('Business not found.',404);
  const html=tenant.theme_draft_html??tenant.theme_html;
  if(!html)throw new BookingError('No ZIP imported.',404);
  const css=tenant.theme_draft_html!==null?tenant.theme_draft_css:tenant.theme_css;
  const js=tenant.theme_draft_html!==null?tenant.theme_draft_js:tenant.theme_js;
  return new Response(frameDocument(html,css||'',js||''),{headers:{
    'Content-Type':'text/html; charset=utf-8',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    'Content-Security-Policy':"sandbox allow-scripts; default-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; form-action 'none'; connect-src 'none'; base-uri 'none'"
  }});
 }catch(e){return fail(e)}
}
