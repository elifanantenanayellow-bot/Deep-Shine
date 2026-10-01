-- F1 fix, database layer: two active appointments for the same practitioner
-- may never overlap in time, regardless of what application code does.
--
-- Cancelled and no-show appointments are excluded so their slots can be
-- rebooked. Ranges are half-open [starts, ends) so back-to-back appointments
-- (end == next start) are legal. Columns are timestamp(3) without time zone
-- (Prisma's DateTime mapping), hence tsrange rather than tstzrange.
--
-- Requires the btree_gist extension (available on Neon, Supabase, RDS and
-- stock Postgres).

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Appointment"
  ADD CONSTRAINT "appointment_no_overlap"
  EXCLUDE USING gist (
    "practitionerId" WITH =,
    tsrange("startsAt", "endsAt") WITH &&
  )
  WHERE (status <> 'CANCELLED' AND status <> 'NO_SHOW');
