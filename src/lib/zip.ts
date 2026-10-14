import JSZip from 'jszip';
import { BookingError } from './booking';

export type ZipTheme={html:string;css:string;js:string};
const MAX_ZIP=4_000_000;
const MAX_UNPACKED=12_000_000;
const supported=/\.(?:html|css|js|mjs|png|jpe?g|webp|gif|woff2?|ico)$/i;
const decoder=new TextDecoder('utf-8',{fatal:true});

function localPath(ref:string,from:string):string|null {
 if(/^(?:data:|https?:|\/\/|#|mailto:|javascript:)/i.test(ref))return null;
 let value=ref.split(/[?#]/,1)[0];
 try{value=decodeURIComponent(value)}catch{return null}
 if(value.includes('\\')||value.includes(':'))return null;
 const parts=value.startsWith('/')?[]:from.split('/').slice(0,-1);
 for(const part of value.split('/')){
  if(!part||part==='.')continue;
  if(part==='..'){if(!parts.length)return null;parts.pop()}
  else parts.push(part);
 }
 return parts.join('/');
}

function mediaType(name:string):string|null {
 const ext=name.split('.').pop()!.toLowerCase();
 const types:Record<string,string>={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',
  webp:'image/webp',gif:'image/gif',ico:'image/x-icon',woff:'font/woff',woff2:'font/woff2'};
 return types[ext]||null;
}

function closeTagSafe(value:string,tag:string):string {
 return value.replace(new RegExp('</'+tag,'gi'),'<\\/'+tag);
}

export async function importTheme(input:File):Promise<ZipTheme>{
 if(!input||input.size<10||input.size>MAX_ZIP||!input.name.toLowerCase().endsWith('.zip'))
  throw new BookingError('Choose a ZIP up to 4 MB.');
 let archive:JSZip;
 try{archive=await JSZip.loadAsync(await input.arrayBuffer(),{checkCRC32:true})}
 catch{throw new BookingError('Could not read ZIP.')}
 const entries=Object.entries(archive.files).filter(([name,item])=>
  !item.dir&&!name.startsWith('__MACOSX/')&&!name.endsWith('/.DS_Store')&&name!=='.DS_Store');
 if(!entries.length||entries.length>100)throw new BookingError('The ZIP must contain 1 to 100 website files.');
 const names=entries.map(([name])=>name);
 const first=names[0].split('/')[0];
 const prefix=names.every(name=>name.startsWith(first+'/'))?first+'/':'';
 const files=new Map<string,Uint8Array>();
 let total=0;
 for(const [original,item] of entries){
  const name=original.slice(prefix.length);
  const parts=name.split('/');
  if(!name||name.startsWith('/')||name.includes('\\')||name.includes(':')||
    parts.some(part=>!part||part==='.'||part==='..'||part.startsWith('.'))||
    !supported.test(name)||files.has(name))throw new BookingError('ZIP contains unsafe or unsupported files.');
  const estimate=(item as unknown as {_data?:{uncompressedSize?:number}})._data?.uncompressedSize||0;
  if(estimate>MAX_UNPACKED||total+estimate>MAX_UNPACKED)
    throw new BookingError('ZIP is too large after extraction.');
  const bytes=await item.async('uint8array');
  total+=bytes.byteLength;
  if(total>MAX_UNPACKED)throw new BookingError('ZIP is too large after extraction.');
  files.set(name,bytes);
 }
 if(!files.has('index.html'))throw new BookingError('Include index.html in the ZIP or in one enclosing folder.');
 const read=(name:string)=>decoder.decode(files.get(name)!);
 const asset=(ref:string,from:string):string|null=>{
  const path=localPath(ref,from);
  if(!path||!files.has(path))return null;
  const mime=mediaType(path);
  return mime?'data:'+mime+';base64,'+Buffer.from(files.get(path)!).toString('base64'):null;
 };
 const rewriteAssets=(value:string,from:string)=>{
  let output=value.replace(/\b(src|poster)\s*=\s*(["'])([^"']+)\2/gi,(found,attr,quote,ref)=>{
    const url=asset(ref,from);
    return url?attr+'='+quote+url+quote:found;
  });
  output=output.replace(/url\(\s*(["']?)([^'")]+)\1\s*\)/gi,(found,_q,ref)=>{
    const url=asset(ref.trim(),from);
    return url?'url("'+url+'")':found;
  });
  return output;
 };
 const css=(name:string,seen:Set<string>=new Set()):string=>{
   if(seen.has(name)||seen.size>15)throw new BookingError('CSS has too many or circular imports.');
   seen.add(name);
   const inputCss=read(name).replace(/@import\s+(?:url\(\s*)?(["'])([^"']+)\1\s*\)?\s*;/gi,(found,_quote,ref)=>{
     const path=localPath(ref,name);
     return path&&files.has(path)&&path.endsWith('.css')?css(path,new Set(seen)):found;
   });
   return rewriteAssets(inputCss,name);
 };
 let html=read('index.html');
 html=html.replace(/<link\b[^>]*>/gi,tag=>{
  if(!/\brel\s*=\s*["']stylesheet["']/i.test(tag))return tag;
  const m=tag.match(/\bhref\s*=\s*(["'])([^"']+)\1/i);
  const path=m?localPath(m[2],'index.html'):null;
  return path&&files.has(path)&&path.endsWith('.css')?
    '<style>'+closeTagSafe(css(path),'style')+'</style>':tag;
 });
 html=html.replace(/<script\b[^>]*\bsrc\s*=\s*(["'])([^"']+)\1[^>]*>\s*<\/script\s*>/gi,(tag,_quote,ref)=>{
   const path=localPath(ref,'index.html');
   if(!path||!files.has(path)||!/\.(js|mjs)$/i.test(path))return tag;
   const isModule=/\btype\s*=\s*["']module["']/i.test(tag);
   return '<script'+(isModule?' type="module"':'')+'>'+closeTagSafe(read(path),'script')+'</script>';
 });
 html=rewriteAssets(html,'index.html');
 if(html.length>9_000_000)throw new BookingError('The site is too large after processing.');
 return {html,css:'',js:''};
}

export function frameDocument(html:string,css:string,js:string):string{
 // Opaque-origin sandbox blocks ZIP from reading BookingSystem cookies or contacting external APIs.
 const csp="default-src 'none'; base-uri 'none'; form-action 'none'; connect-src 'none'; img-src data:; font-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'";
 let page=/<html\b/i.test(html)?html:'<!doctype html><html><head></head><body>'+html+'</body></html>';
 const shim='<meta http-equiv="Content-Security-Policy" content="'+csp+'"><style>'+closeTagSafe(css,'style')+'</style>'+
  '<script>window.OrbittaBooking=Object.freeze({open:function(){parent.postMessage({type:"ORBITTA_BOOK_NOW"},"*")}});</script>';
 if(/<head\b[^>]*>/i.test(page))page=page.replace(/<head\b[^>]*>/i,m=>m+shim);
 else page=page.replace(/<html\b[^>]*>/i,m=>m+'<head>'+shim+'</head>');
 if(js.trim())page=page.replace(/<\/body>/i,'<script>'+closeTagSafe(js,'script')+'</script></body>');
 return page;
}
