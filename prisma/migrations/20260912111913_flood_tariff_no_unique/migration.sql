-- DropIndex
DROP INDEX "tariff_flood_line_region_zone_coverage_type_key";

-- CreateIndex
CREATE INDEX "tariff_flood_line_region_idx" ON "tariff_flood"("line", "region");
