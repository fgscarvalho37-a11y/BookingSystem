import {checkAdmin} from '@/lib/admin';
import {sql} from '@/lib/db';
import {importTheme} from '@/lib/zip';
import {fail,safeSlug} from '@/lib/http';
import {BookingError} from '@/lib/booking';
export const dynamic='force-dynamic';

export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){
 const auth=await checkAdmin();if(auth)return auth;
 try{
  const slug=safeSlug((await params).slug);
  if(Number(request.headers.get('content-length')||0)>5_000_000)throw new BookingError('ZIP exceeds 4 MB.',413);
  const data=await request.formData(),file=data.get('file');
  if(!(file instanceof File))throw new BookingError('Select a ZIP file.');
  const theme=await importTheme(file);
  const name=file.name.slice(0,180).replace(/[^\w.\- ()]/g,'_');
  const updated=await sql<{slug:string}>(
   'UPDATE booking_tenants SET theme_draft_html=$2,theme_draft_css=$3,theme_draft_js=$4,theme_draft_zip_name=$5 WHERE slug=$1 RETURNING slug',
   [slug,theme.html,theme.css,theme.js,name]);
  if(!updated[0])throw new BookingError('Business not found.',404);
  return Response.json({ok:true,slug,draft:true,file:name},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return fail(e)}
}

export async function PUT(_request:Request,{params}:{params:Promise<{slug:string}>}){
 const auth=await checkAdmin();if(auth)return auth;
 try{
  const slug=safeSlug((await params).slug);
  const updated=await sql<{slug:string}>(
   'UPDATE booking_tenants SET theme_html=theme_draft_html,theme_css=theme_draft_css,theme_js=theme_draft_js,theme_zip_name=theme_draft_zip_name,theme_draft_html=NULL,theme_draft_css=NULL,theme_draft_js=NULL,theme_draft_zip_name=NULL WHERE slug=$1 AND theme_draft_html IS NOT NULL RETURNING slug',
   [slug]);
  if(!updated[0])throw new BookingError('No draft ZIP for this business.',404);
  return Response.json({ok:true,slug,published:true},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return fail(e)}
}

export async function DELETE(request:Request,{params}:{params:Promise<{slug:string}>}){
 const auth=await checkAdmin();if(auth)return auth;
 try{
  const slug=safeSlug((await params).slug);
  const draftOnly=new URL(request.url).searchParams.get('draft')==='true';
  const query=draftOnly
    ?'UPDATE booking_tenants SET theme_draft_html=NULL,theme_draft_css=NULL,theme_draft_js=NULL,theme_draft_zip_name=NULL WHERE slug=$1 RETURNING slug'
    :'UPDATE booking_tenants SET theme_html=NULL,theme_css=NULL,theme_js=NULL,theme_zip_name=NULL,theme_draft_html=NULL,theme_draft_css=NULL,theme_draft_js=NULL,theme_draft_zip_name=NULL WHERE slug=$1 RETURNING slug';
  const updated=await sql<{slug:string}>(query,[slug]);
  if(!updated[0])throw new BookingError('Business not found.',404);
  return Response.json({ok:true,slug,draftDiscarded:draftOnly},{headers:{'Cache-Control':'no-store'}});
 }catch(e){return fail(e)}
}
