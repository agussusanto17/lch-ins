-- DropForeignKey
ALTER TABLE "policies" DROP CONSTRAINT "policies_client_id_fkey";

-- AlterTable
ALTER TABLE "policies" ALTER COLUMN "client_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

