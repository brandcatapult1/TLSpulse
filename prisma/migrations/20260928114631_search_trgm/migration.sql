-- Typo-tolerant global search (Handbook §15).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS brand_name_trgm ON "Brand" USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS resource_name_trgm ON "Resource" USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS shoot_location_trgm ON "Shoot" USING gin (location gin_trgm_ops);
