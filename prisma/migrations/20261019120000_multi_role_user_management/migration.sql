-- AlterTable
ALTER TABLE "users"
ADD COLUMN "roles" TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN "job_title" TEXT,
ADD COLUMN "must_change_password" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "role_id" DROP NOT NULL;

-- Backfill roles from existing lookup_values for existing users
UPDATE "users" u
SET "roles" = ARRAY[lv.code]
FROM "lookup_values" lv
WHERE u.role_id = lv.id AND (u.roles IS NULL OR array_length(u.roles, 1) IS NULL);

-- Ensure accounting role exists in lookup_values
INSERT INTO "lookup_values" ("id", "lookup_type", "code", "name", "sort_order", "is_system", "is_active", "created_at", "updated_at")
VALUES (gen_random_uuid(), 'role', 'accounting', 'Accounting', 4, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("lookup_type", "code") DO NOTHING;
