import {checkAdmin} from '@/lib/admin';
import {sql} from '@/lib/db';
import {importTheme} from '@/lib/zip';
import {fail,safeSlug} from '@/lib/http';
import {BookingError} from '@/lib/booking';
export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){
 const check=await checkAdmin();if(check)return check;
 try{
 const slug=safeSlug((await params).slug);
 if(Number(request.headers.get('content-length')||0)>4_500_000)throw new BookingError('Upload too large.',413);
 const data=await request.formData(),file=data.get('file');
 if(!(file instanceof File))throw new BookingError('Select a ZIP file.');
 const theme=await importTheme(file);
 const result=await sql<{slug:string}>('UPDATE booking_tenants SET theme_html=$2,theme_css=$3,theme_js=$4 WHERE slug=$1 RETURNING slug',[slug,theme.html,theme.css,theme.js]);
 if(!result[0])throw new BookingError('Business not found.',404);return Response.json({ok:true,slug});
 }catch(e){return fail(e)}
}
export async function DELETE(_request:Request,{params}:{params:Promise<{slug:string}>}){
 const check=await checkAdmin();if(check)return check;
 try{await sql('UPDATE booking_tenants SET theme_html=NULL,theme_css=NULL,theme_js=NULL WHERE slug=$1',[safeSlug((await params).slug)]);return Response.json({ok:true});}catch(e){return fail(e)}
}
