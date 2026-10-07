-- AlterTable
ALTER TABLE "User" ADD COLUMN     "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "sentAt" TIMESTAMP(3),
ADD COLUMN     "sentTo" TEXT;

-- CreateTable
CREATE TABLE "OrgUnit" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrgUnit_name_key" ON "OrgUnit"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Lista fillestare (deri tani në kod) + çdo emër që përdoret tashmë nga detyrat ose përdoruesit.
INSERT INTO "OrgUnit" ("id", "name", "active", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, n, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
    VALUES
        ('Agjencia e Sigurimit dhe Cilësisë së Kujdesit Shëndetësor'),
        ('Agjencia Kombëtare e Barnave'),
        ('Agjencia Shtetërore për Mbrojtjen e të Drejtave të Fëmijëve'),
        ('Drejtoria e Barazisë Gjinore'),
        ('Drejtoria e Buxhetit'),
        ('Drejtoria e Farmaceutikës dhe PM'),
        ('Drejtoria e Inteligjencës Artificiale dhe Analizës së të Dhënave'),
        ('Drejtoria e Kujdesit Parësor'),
        ('Drejtoria e Politikave Sociale'),
        ('Drejtoria e Shërbimit Spitalor'),
        ('Drejtoria Juridike'),
        ('Instituti i Shëndetit Publik'),
        ('OSHKSH')
) AS v(n)
ON CONFLICT ("name") DO NOTHING;

INSERT INTO "OrgUnit" ("id", "name", "active", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, n, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
    SELECT "orgUnit" AS n FROM "User" WHERE "orgUnit" IS NOT NULL AND "orgUnit" <> ''
    UNION
    SELECT "orgUnit" FROM "Task" WHERE "orgUnit" IS NOT NULL AND "orgUnit" <> ''
) AS used
ON CONFLICT ("name") DO NOTHING;
