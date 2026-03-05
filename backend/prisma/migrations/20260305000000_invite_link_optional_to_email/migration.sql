-- AlterTable: приглашения по ссылке без email (toEmail опционально)
ALTER TABLE "Invite" ALTER COLUMN "toEmail" DROP NOT NULL;
