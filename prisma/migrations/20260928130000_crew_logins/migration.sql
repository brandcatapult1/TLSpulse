-- Crew logins: a resource can have one view-only login.
ALTER TYPE "Role" ADD VALUE 'CREW';
ALTER TABLE "User" ADD COLUMN "resourceId" TEXT;
CREATE UNIQUE INDEX "User_resourceId_key" ON "User"("resourceId");
ALTER TABLE "User" ADD CONSTRAINT "User_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "Resource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
