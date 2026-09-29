-- Optional Google Maps pin for a shoot's location.
ALTER TABLE "Shoot" ADD COLUMN "locationLat" DOUBLE PRECISION;
ALTER TABLE "Shoot" ADD COLUMN "locationLng" DOUBLE PRECISION;
ALTER TABLE "Shoot" ADD COLUMN "locationPlaceId" TEXT;
