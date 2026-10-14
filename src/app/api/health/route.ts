import { pool } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    const result = await pool().query(
      "SELECT to_regclass('public.booking_tenants') IS NOT NULL AS tenants, to_regclass('public.booking_services') IS NOT NULL AS services, to_regclass('public.booking_appointments') IS NOT NULL AS appointments"
    );
    const row = result.rows[0];
    const ready = !!(row?.tenants && row?.services && row?.appointments);
    return Response.json(
      {service:'BookingSystem', status:ready ? 'ready' : 'needs_migration', database: 'connected'},
      {status:ready ? 200 : 503, headers:{'Cache-Control':'no-store'}}
    );
  } catch {
    return Response.json(
      {service:'BookingSystem', status:'unavailable', database:'not_ready'},
      {status:503, headers:{'Cache-Control':'no-store'}}
    );
  }
}
