-- Execute once against a new, isolated PostgreSQL database, never Orbitta's production database.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE IF NOT EXISTS booking_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug varchar(70) UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name varchar(140) NOT NULL,
  tagline varchar(220) NOT NULL DEFAULT 'The best version of you, by appointment.',
  description text NOT NULL DEFAULT 'Thoughtful service. Beautiful results.',
  accent varchar(7) NOT NULL DEFAULT '#d9aa72',
  hero_image text NOT NULL DEFAULT '',
  timezone varchar(80) NOT NULL DEFAULT 'America/New_York',
  opens_at time NOT NULL DEFAULT '09:00',
  closes_at time NOT NULL DEFAULT '18:00',
  weekdays integer[] NOT NULL DEFAULT '{1,2,3,4,5,6}',
  orbitta_product_id bigint UNIQUE,
  trial_until timestamptz,
  theme_html text,
  theme_css text,
  theme_js text,
  theme_preset varchar(16) NOT NULL DEFAULT 'classic' CHECK(theme_preset IN ('classic','minimal','bold')),
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS booking_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES booking_tenants(id) ON DELETE CASCADE,
  name varchar(120) NOT NULL,
  description varchar(300) NOT NULL DEFAULT '',
  price_cents integer NOT NULL CHECK (price_cents >= 0 AND price_cents <= 10000000),
  duration_min integer NOT NULL CHECK (duration_min BETWEEN 15 AND 480),
  enabled boolean NOT NULL DEFAULT true
);
CREATE INDEX IF NOT EXISTS idx_booking_services_tenant ON booking_services(tenant_id);
CREATE TABLE IF NOT EXISTS booking_appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES booking_tenants(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES booking_services(id),
  customer_name varchar(90) NOT NULL,
  customer_email varchar(200) NOT NULL,
  customer_phone varchar(30) NOT NULL,
  start_at timestamptz NOT NULL,
  end_at timestamptz NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('CONFIRMED','CANCELLED','COMPLETED')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_booking_appointments_slot ON booking_appointments(tenant_id,start_at,end_at);
