import {clearAdminCookie,checkAdmin} from '@/lib/admin';
export async function POST(){const check=await checkAdmin();if(check)return check;await clearAdminCookie();return Response.json({ok:true});}
