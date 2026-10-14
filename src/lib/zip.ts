import JSZip from 'jszip';
import { BookingError } from './booking';
export type ZipTheme={html:string;css:string;js:string};
export async function importTheme(input:File):Promise<ZipTheme>{
 if(!input||input.size>4_000_000||input.size<10)throw new BookingError('ZIP must be 4 MB or smaller.');
 let zip:JSZip;try{zip=await JSZip.loadAsync(await input.arrayBuffer(),{checkCRC32:true});}catch{throw new BookingError('Could not read ZIP.');}
 const names=Object.keys(zip.files).filter(name=>!zip.files[name].dir);
 if(names.length>35||!names.includes('index.html'))throw new BookingError('Include index.html and up to 35 files.');
 let expanded=0;
 const files=new Map<string,Uint8Array>();
 for(const name of names){
  if(name.startsWith('/')||name.includes('..')||name.includes('\\')||name.includes(':')||!(/^(index\.html|style\.css|app\.js)$/.test(name)||/^assets\/[a-zA-Z0-9._-]+\.(png|jpg|jpeg|webp)$/.test(name)))throw new BookingError('ZIP contains unsupported files.');
  const entry=zip.files[name];
  const declared=(entry as unknown as {_data?:{uncompressedSize?:number}})._data?.uncompressedSize||0;
  if(declared>5_000_000||expanded+declared>5_000_000)throw new BookingError('Uncompressed ZIP is too large.');
  const bytes=await entry.async('uint8array');expanded+=bytes.byteLength;
  if(expanded>5_000_000)throw new BookingError('Uncompressed ZIP is too large.');
  files.set(name,bytes);
 }
 const dec=new TextDecoder('utf-8',{fatal:true});
 let html='',css='',js='';
 try{html=dec.decode(files.get('index.html'));css=dec.decode(files.get('style.css')||new Uint8Array());js=dec.decode(files.get('app.js')||new Uint8Array());}
 catch{throw new BookingError('Text files must be UTF-8.');}
 if(html.length>350000||css.length>350000||js.length>350000)throw new BookingError('HTML, CSS or JS is too large.');
 for(const [name,bytes] of files){
  if(!name.startsWith('assets/'))continue;
  const ext=name.split('.').pop()!.toLowerCase();
  const mime=ext==='png'?'image/png':ext==='webp'?'image/webp':'image/jpeg';
  const inline=`data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;
  for(const ref of [name,'./'+name,'/'+name]){
   html=html.replaceAll(`"${ref}"`,`"${inline}"`).replaceAll(`'${ref}'`,`'${inline}'`);
   css=css.replaceAll(`url(${ref})`,`url(${inline})`).replaceAll(`url('${ref}')`,`url('${inline}')`).replaceAll(`url("${ref}")`,`url("${inline}")`);
   js=js.replaceAll(`"${ref}"`,`"${inline}"`).replaceAll(`'${ref}'`,`'${inline}'`);
  }
 }
 if(html.length+css.length+js.length>7_500_000)throw new BookingError('ZIP expanded content is too large.');
 return {html,css,js};
}
function safeInline(text:string,tag:string){return text.replaceAll(new RegExp('</'+tag,'gi'),'<\\/'+tag);}
export function frameDocument(html:string,css:string,js:string):string{
 // Frame has opaque origin (sandbox=allow-scripts only), CSP denies all network calls and form submissions.
 const csp=`default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; connect-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'`;
 const page=html.includes('<html')?html:`<!doctype html><html><head></head><body>${html}</body></html>`;
 const shim=`<meta http-equiv="Content-Security-Policy" content="${csp}"><style>${safeInline(css,'style')}</style><script>window.OrbittaBooking=Object.freeze({open:function(){parent.postMessage({type:'ORBITTA_BOOK_NOW'},'*')}});</script>`;
 let doc=page.replace(/<head[^>]*>/i,match=>match+shim);
 if(!doc.includes(shim))doc=doc.replace(/<html[^>]*>/i,match=>match+'<head>'+shim+'</head>');
 const embedded=js.trim()?`<script>${safeInline(js,'script')}</script>`:'';
 doc=doc.replace(/<\/body>/i,embedded+'</body>');
 return doc;
}
