-- AlterTable
ALTER TABLE "policies" ADD COLUMN     "cob_ojk_class_id" UUID,
ADD COLUMN     "endorsement_seq" INTEGER,
ADD COLUMN     "grouping_insured" TEXT,
ADD COLUMN     "placement_location_id" UUID;

-- CreateTable
CREATE TABLE "cob_ojk_classes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cob_ojk_classes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cob_ojk_classes_name_key" ON "cob_ojk_classes"("name");

-- CreateIndex
CREATE UNIQUE INDEX "policies_parent_policy_id_endorsement_seq_key" ON "policies"("parent_policy_id", "endorsement_seq");

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_cob_ojk_class_id_fkey" FOREIGN KEY ("cob_ojk_class_id") REFERENCES "cob_ojk_classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "policies" ADD CONSTRAINT "policies_placement_location_id_fkey" FOREIGN KEY ("placement_location_id") REFERENCES "lookup_values"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Nilai lookup placement_location (ERD), supaya produksi tidak perlu seed ulang.
INSERT INTO "lookup_values" ("id", "lookup_type", "code", "name", "sort_order", "is_system", "is_active", "created_at", "updated_at")
VALUES
  (gen_random_uuid(), 'placement_location', 'domestic', 'Dalam Negeri', 1, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid(), 'placement_location', 'overseas', 'Luar Negeri', 2, false, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("lookup_type", "code") DO NOTHING;

-- Nomor urut untuk endorsement yang sudah ada, berurutan per polis induk.
UPDATE "policies" p
SET "endorsement_seq" = s.seq
FROM (
  SELECT po."id", ROW_NUMBER() OVER (PARTITION BY po."parent_policy_id" ORDER BY po."inception_date", po."created_at") AS seq
  FROM "policies" po
  JOIN "lookup_values" lv ON lv."id" = po."policy_type_id"
  WHERE lv."lookup_type" = 'policy_type' AND lv."code" = 'endorsement' AND po."parent_policy_id" IS NOT NULL
) s
WHERE p."id" = s."id";
