# Master Data Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun modul Master Data (`/master-data`) berbasis PostgreSQL & Prisma dengan 5 tab interaktif untuk mengelola COB/Cover Type, Tarif OJK, Rekanan (Asuradur & Adjuster), Keuangan/Dokumen, dan Lookup Values secara mandiri oleh tim operasional LCH.

**Architecture:** Modul terbagi atas server-only data access layer (`lib/server/master-data.ts`), Next.js Server Actions (`app/(app)/master-data/actions.ts`), komponen UI tab modular (`components/master-data/*`), dan halaman App Router server prefetch (`app/(app)/master-data/page.tsx`). Setiap mutasi terintegrasi dengan audit trail dan mematuhi guard integritas referensial.

**Tech Stack:** Next.js 16 (App Router, Turbopack, Server Actions), React 19, Prisma 7, PostgreSQL, Tailwind CSS v4, Lucide Icons, Sonner Toast.

**Spec:** `docs/superpowers/specs/2026-10-21-master-data-design.md`

## Global Constraints

- Rute dilindungi oleh `requireAccess("/master-data")` (role `admin` atau `underwriter`).
- Tidak boleh ada penghapusan fisik jika data sudah direferensikan oleh transaksi (SPPA, slip, polis, klaim, dll); gunakan penonaktifan `isActive = false`.
- Seluruh mutasi harus mencatat histori ke `audit_logs` via `recordAudit`.
- Layout tabel wajib menerapkan `min-w-200` dan `overflow-x-auto` sesuai `/frontend-code-review`.
- Form wajib memiliki label, placeholder, dan validasi Zod dengan pesan kesalahan ramah pengguna.
- Sebelum push: `npx tsc --noEmit` dan `npm run build` harus lolos tanpa error.

## Review Focus

1. **Pencegahan Penghapusan Data Terpakai:** Rekord COB, Cover Type, Rekanan, atau Lookup yang memiliki referensi asing menolak penghapusan dan memberikan rekomendasi penonaktifan.
2. **Proteksi Lookup Sistem (`isSystem`):** Nilai lookup bertanda `isSystem: true` tidak boleh diubah kode atau dihapus, hanya label dan urutan yang boleh disesuaikan.
3. **Redaksi & Audit Trail:** Setiap mutasi master data tercatat di audit trail dengan entitas yang sesuai (`classes_of_business`, `cover_types`, `insurers`, dll).
4. **Pencarian & Filter Multikriteria:** Tabel mendukung pencarian teks, filter aktif/semua, dan pengurutan tanpa clipping pada viewport kecil.
5. **Dukungan Rekening Titipan Premi:** Rekening bank LCH dapat ditandai sebagai titipan premi (`is_premium_trust`) secara eksplisit.

---

### Task 1: Server Data Layer (`lib/server/master-data.ts`)

**Files:**
- Create: `lib/server/master-data.ts`
- Test: `scripts/test-master-data-e2e.ts`

**Interfaces:**
- Consumes: `prisma` dari `lib/prisma.ts`, `recordAudit` dari `server/services/audit.ts`
- Produces:
  - `listMasterCob(): Promise<MasterCobRecord[]>`
  - `createCob(input: CobInput, userId: string): Promise<ClassOfBusiness>`
  - `updateCob(id: string, input: CobInput, userId: string): Promise<ClassOfBusiness>`
  - `toggleCobStatus(id: string, isActive: boolean, userId: string): Promise<void>`
  - `createCoverType(input: CoverTypeInput, userId: string): Promise<CoverType>`
  - `updateCoverType(id: string, input: CoverTypeInput, userId: string): Promise<CoverType>`
  - `toggleCoverTypeStatus(id: string, isActive: boolean, userId: string): Promise<void>`
  - `listInsurers(): Promise<Insurer[]>`
  - `createInsurer(input: InsurerInput, userId: string): Promise<Insurer>`
  - `updateInsurer(id: string, input: InsurerInput, userId: string): Promise<Insurer>`
  - `toggleInsurerStatus(id: string, isActive: boolean, userId: string): Promise<void>`
  - `listAdjusters(): Promise<Adjuster[]>`
  - `createAdjuster(input: AdjusterInput, userId: string): Promise<Adjuster>`
  - `updateAdjuster(id: string, input: AdjusterInput, userId: string): Promise<Adjuster>`
  - `toggleAdjusterStatus(id: string, isActive: boolean, userId: string): Promise<void>`
  - `listBankAccounts(): Promise<BankAccountRecord[]>`
  - `createBankAccount(input: BankAccountInput, userId: string): Promise<BankAccount>`
  - `updateBankAccount(id: string, input: BankAccountInput, userId: string): Promise<BankAccount>`
  - `toggleBankAccountStatus(id: string, isActive: boolean, userId: string): Promise<void>`
  - `listCurrencies(): Promise<Currency[]>`
  - `listWordingForms(): Promise<WordingForm[]>`
  - `createWordingForm(name: string, userId: string): Promise<WordingForm>`
  - `toggleWordingFormStatus(id: string, isActive: boolean, userId: string): Promise<void>`
  - `listLookupValues(type?: string): Promise<LookupValue[]>`
  - `createLookupValue(input: LookupValueInput, userId: string): Promise<LookupValue>`
  - `updateLookupValue(id: string, input: LookupValueInput, userId: string): Promise<LookupValue>`
  - `toggleLookupValueStatus(id: string, isActive: boolean, userId: string): Promise<void>`
  - `listOccupations(params?: { search?: string; limit?: number }): Promise<OccupationRecord[]>`

- [ ] **Step 1: Write initial test assertions in `scripts/test-master-data-e2e.ts`**
- [ ] **Step 2: Run test and observe missing module error**
- [ ] **Step 3: Implement `lib/server/master-data.ts` with reference checking and `recordAudit` calls**
- [ ] **Step 4: Re-run test and verify data layer queries and mutations pass**
- [ ] **Step 5: Commit Task 1**

```bash
git add lib/server/master-data.ts scripts/test-master-data-e2e.ts
git commit -m "feat(master-data): implement server data layer with audit and reference guards"
```

---

### Task 2: Server Actions (`app/(app)/master-data/actions.ts`)

**Files:**
- Create: `app/(app)/master-data/actions.ts`
- Test: `scripts/test-master-data-e2e.ts`

**Interfaces:**
- Consumes: `requireAccess` dari `lib/server/session.ts`, `lib/server/master-data.ts`
- Produces:
  - `createCobAction(data: CobInput): Promise<ActionResponse<ClassOfBusiness>>`
  - `updateCobAction(id: string, data: CobInput): Promise<ActionResponse<ClassOfBusiness>>`
  - `toggleCobStatusAction(id: string, isActive: boolean): Promise<ActionResponse<void>>`
  - `createCoverTypeAction(data: CoverTypeInput): Promise<ActionResponse<CoverType>>`
  - `updateCoverTypeAction(id: string, data: CoverTypeInput): Promise<ActionResponse<CoverType>>`
  - `toggleCoverTypeStatusAction(id: string, isActive: boolean): Promise<ActionResponse<void>>`
  - `createInsurerAction(data: InsurerInput): Promise<ActionResponse<Insurer>>`
  - `updateInsurerAction(id: string, data: InsurerInput): Promise<ActionResponse<Insurer>>`
  - `toggleInsurerStatusAction(id: string, isActive: boolean): Promise<ActionResponse<void>>`
  - `createAdjusterAction(data: AdjusterInput): Promise<ActionResponse<Adjuster>>`
  - `updateAdjusterAction(id: string, data: AdjusterInput): Promise<ActionResponse<Adjuster>>`
  - `toggleAdjusterStatusAction(id: string, isActive: boolean): Promise<ActionResponse<void>>`
  - `createBankAccountAction(data: BankAccountInput): Promise<ActionResponse<BankAccount>>`
  - `updateBankAccountAction(id: string, data: BankAccountInput): Promise<ActionResponse<BankAccount>>`
  - `toggleBankAccountStatusAction(id: string, isActive: boolean): Promise<ActionResponse<void>>`
  - `createWordingFormAction(name: string): Promise<ActionResponse<WordingForm>>`
  - `toggleWordingFormStatusAction(id: string, isActive: boolean): Promise<ActionResponse<void>>`
  - `createLookupValueAction(data: LookupValueInput): Promise<ActionResponse<LookupValue>>`
  - `updateLookupValueAction(id: string, data: LookupValueInput): Promise<ActionResponse<LookupValue>>`
  - `toggleLookupValueStatusAction(id: string, isActive: boolean): Promise<ActionResponse<void>>`

- [ ] **Step 1: Define Zod validation schemas for all master data inputs**
- [ ] **Step 2: Implement server actions with `requireAccess("/master-data")` and `revalidatePath("/master-data")`**
- [ ] **Step 3: Verify TypeScript compilation (`npx tsc --noEmit`)**
- [ ] **Step 4: Commit Task 2**

```bash
git add app/\(app\)/master-data/actions.ts
git commit -m "feat(master-data): add server actions with authorization and validation"
```

---

### Task 3: UI Tab Komponen & Dialog Master Data

**Files:**
- Create: `components/master-data/master-data-tabs.tsx`
- Create: `components/master-data/cob-cover-tab.tsx`
- Create: `components/master-data/tariff-ojk-tab.tsx`
- Create: `components/master-data/insurers-adjusters-tab.tsx`
- Create: `components/master-data/finance-docs-tab.tsx`
- Create: `components/master-data/lookup-values-tab.tsx`

**Interfaces:**
- Consumes: Server Actions dari `app/(app)/master-data/actions.ts`, UI primitives (`Table`, `Button`, `Input`, `Dialog`, `StatusBadge`, `TablePagination`)
- Produces: Interactive 5-tab interface dengan visual status, sorting, filtering, dialog modal tambah/edit, dan responsivitas tabel `min-w-200`.

- [ ] **Step 1: Implement `cob-cover-tab.tsx` with COB and sub-cover type tables**
- [ ] **Step 2: Implement `tariff-ojk-tab.tsx` with searchable occupation tariffs and construction classes**
- [ ] **Step 3: Implement `insurers-adjusters-tab.tsx` with partner status and notice**
- [ ] **Step 4: Implement `finance-docs-tab.tsx` with currencies, bank accounts, and wording forms**
- [ ] **Step 5: Implement `lookup-values-tab.tsx` with filter by lookup type and system protection**
- [ ] **Step 6: Implement `master-data-tabs.tsx` shell linking all 5 tabs**
- [ ] **Step 7: Run TypeScript verification (`npx tsc --noEmit`)**
- [ ] **Step 8: Commit Task 3**

```bash
git add components/master-data/
git commit -m "feat(master-data): implement 5-tab master data management UI"
```

---

### Task 4: Server Page Integration & Sidebar Activation

**Files:**
- Modify: `app/(app)/master-data/page.tsx`
- Modify: `components/layout/nav-items.ts`

- [ ] **Step 1: Update `app/(app)/master-data/page.tsx` to prefetch master data entities in parallel and render `MasterDataTabs`**
- [ ] **Step 2: Remove `soon: true` from `Master Data` in `components/layout/nav-items.ts`**
- [ ] **Step 3: Run `npm run build` to verify full compilation of `/master-data`**
- [ ] **Step 4: Commit Task 4**

```bash
git add app/\(app\)/master-data/page.tsx components/layout/nav-items.ts
git commit -m "feat(master-data): integrate server prefetch and activate sidebar navigation"
```

---

### Task 5: End-to-End Verification & Documentation

**Files:**
- Create: `docs/changes/implementasi-master-data-2026-10-21.md`
- Run: `scripts/test-master-data-e2e.ts`
- Run: `graphify update .`

- [ ] **Step 1: Run E2E test suite `node -r ./scripts/mock-server-only.cjs --import tsx --env-file=.env scripts/test-master-data-e2e.ts`**
- [ ] **Step 2: Run `npx tsc --noEmit` and `npm run build`**
- [ ] **Step 3: Run `graphify update .`**
- [ ] **Step 4: Create documentation in `docs/changes/implementasi-master-data-2026-10-21.md`**
- [ ] **Step 5: Commit and push branch, open PR**

```bash
git add docs/changes/implementasi-master-data-2026-10-21.md scripts/test-master-data-e2e.ts
git commit -m "docs(master-data): add implementation change notes and e2e test suite"
```
