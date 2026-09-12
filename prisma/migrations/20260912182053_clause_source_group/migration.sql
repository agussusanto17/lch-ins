-- AlterTable
ALTER TABLE "clauses" ADD COLUMN     "source_group" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "clauses_title_source_group_key" ON "clauses"("title", "source_group");

