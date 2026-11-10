-- Jenis berkas polis keempat: dokumen slip untuk polis yang slipnya dibuat di
-- luar sistem LCH (meeting LCH, 10 November 2026).
ALTER TYPE "PolicyFileKind" ADD VALUE IF NOT EXISTS 'Slip';
