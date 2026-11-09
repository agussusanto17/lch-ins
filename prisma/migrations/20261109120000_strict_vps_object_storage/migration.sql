-- Trigger guard untuk memastikan penyimpanan berkas di database PostgreSQL
-- ditolak bila parameter database 'app.require_object_storage' bernilai 'true'.
--
-- Pada VPS lch-server, parameter ini diaktifkan di level database:
--   ALTER DATABASE lch_ins SET app.require_object_storage = 'true';
--
-- Pada demo Vercel atau lingkungan dev, parameter ini tidak diset (default NULL / false),
-- sehingga fallback database bytea tetap dapat berjalan tanpa kendala.

CREATE OR REPLACE FUNCTION enforce_strict_object_storage()
RETURNS TRIGGER AS $$
BEGIN
  IF current_setting('app.require_object_storage', true) = 'true' THEN
    IF NEW.data IS NOT NULL THEN
      RAISE EXCEPTION 'Penyimpanan isi berkas ke kolom data (bytea) dilarang pada server ini. Gunakan object storage RustFS.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enforce_strict_object_storage ON "stored_files";

CREATE TRIGGER trg_enforce_strict_object_storage
BEFORE INSERT OR UPDATE ON "stored_files"
FOR EACH ROW
EXECUTE FUNCTION enforce_strict_object_storage();
