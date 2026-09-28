-- Internal/External now belongs to the team; resources inherit it from their team.
ALTER TABLE "Team" ADD COLUMN "type" "Engagement" NOT NULL DEFAULT 'INTERNAL';

-- Carry over: a team whose active members were all external becomes an external team.
UPDATE "Team" t SET "type" = 'EXTERNAL'
WHERE EXISTS (SELECT 1 FROM "Resource" r WHERE r."teamId" = t.id)
  AND NOT EXISTS (SELECT 1 FROM "Resource" r WHERE r."teamId" = t.id AND r.engagement = 'INTERNAL');

ALTER TABLE "Resource" DROP COLUMN "engagement";
