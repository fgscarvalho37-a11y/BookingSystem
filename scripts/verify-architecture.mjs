import { readFileSync, existsSync } from 'node:fs';
import { strict as assert } from 'node:assert';
const has = (file) => existsSync(new URL('../'+file, import.meta.url));
const read = (file) => readFileSync(new URL('../'+file, import.meta.url), 'utf8');
for (const file of [
  'src/app/admin/page.tsx',
  'src/app/s/[slug]/page.tsx',
  'src/app/api/public/[slug]/reserve/route.ts',
  'src/app/api/public/[slug]/availability/route.ts',
  'src/lib/license.ts',
  'src/lib/booking.ts',
  'sql/schema.sql',
]) assert(has(file), `Missing independent SaaS file: ${file}`);
assert(!has('src/app/bookings/page.tsx'), 'Commercial landing belongs in Orbitta, not the SaaS');
assert(!has('src/app/admin/agendamentos/page.tsx'), 'Do not mount the SaaS in Orbitta admin');
const license=read('src/lib/license.ts');
assert(license.includes('ORBITTA_LICENSE_URL'), 'Missing Orbitta billing status integration');
assert(license.includes('ORBITTA_LICENSE_TOKEN'), 'Missing server-side access token');
assert(license.includes('cache:\'no-store\''), 'License checks must not be cached');
const booking=read('src/lib/booking.ts');
assert(booking.includes('pg_advisory_xact_lock'), 'Missing concurrency lock');
assert(booking.includes('getAccess(tenant)'), 'Reservation endpoint must enforce Orbitta subscription');
for (const [file,fragment] of [
 ['src/app/api/admin/tenants/[slug]/theme/route.ts', 'WHERE slug=$1'],
 ['src/app/api/admin/tenants/[slug]/theme/route.ts', 'theme_draft_html'],
 ['src/app/api/admin/tenants/[slug]/theme/preview/route.ts', 'theme_draft_html'],
 ['src/components/AdminPanel.tsx', 'Publicar este ZIP'],
]) assert(read(file).includes(fragment), 'Missing per-business ZIP flow: '+file);
const schema=read('sql/schema.sql');
assert(schema.includes('theme_draft_html'), 'Missing ZIP draft fields');
assert(schema.includes('orbitta_product_id'), 'Tenant must map to an Orbitta contract');
console.log('OK: BookingSystem is standalone, with protected tenant and billing boundaries.');
