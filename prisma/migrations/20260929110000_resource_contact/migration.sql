-- Resource contact details (used for the /crew schedule lookup).
ALTER TABLE "Resource" ADD COLUMN "email" TEXT;
ALTER TABLE "Resource" ADD COLUMN "phone" TEXT;
CREATE UNIQUE INDEX "Resource_email_key" ON "Resource"("email");
CREATE UNIQUE INDEX "Resource_phone_key" ON "Resource"("phone");
