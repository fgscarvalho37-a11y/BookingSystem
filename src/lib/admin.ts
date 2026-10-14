import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
const KEY='orbitta_bookings_admin';
const lifetime=60*60*10;
function sign(value:string):string {const key=process.env.SESSION_SECRET;if(!key||key.length<32)throw new Error('SESSION_SECRET must have at least 32 characters.');return createHmac('sha256',key).update(value).digest('hex');}
export function validPassword(password:string):boolean{
 const expected=process.env.ADMIN_PASSWORD;
 if(!expected||expected.length<12)return false;
 const a=Buffer.from(createHmac('sha256','password-check').update(password).digest('hex'));
 const b=Buffer.from(createHmac('sha256','password-check').update(expected).digest('hex'));
 return timingSafeEqual(a,b);
}
export async function signedIn():Promise<boolean>{
 const cookie=(await cookies()).get(KEY)?.value;
 if(!cookie)return false;
 const [issued,signature]=cookie.split('.');
 if(!issued||!signature||!/^[0-9]+$/.test(issued))return false;
 const seconds=Number(issued);
 if(seconds>Date.now()/1000||seconds<(Date.now()/1000)-lifetime)return false;
 const expected=sign(issued);
 return signature.length===expected.length && timingSafeEqual(Buffer.from(signature),Buffer.from(expected));
}
export async function setAdminCookie():Promise<void>{
 const issued=String(Math.floor(Date.now()/1000));
 (await cookies()).set(KEY,issued+'.'+sign(issued),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:lifetime});
}
export async function clearAdminCookie():Promise<void>{(await cookies()).delete(KEY);}
export async function checkAdmin():Promise<Response|null>{if(!(await signedIn()))return Response.json({message:'Sign in required.'},{status:401});return null;}
