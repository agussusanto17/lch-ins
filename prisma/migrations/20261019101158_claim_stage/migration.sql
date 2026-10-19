-- AlterTable
ALTER TABLE "claims" ADD COLUMN     "stage_id" UUID;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "lookup_values"("id") ON DELETE SET NULL ON UPDATE CASCADE;
