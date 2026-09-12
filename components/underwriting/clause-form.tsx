"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Save, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { PageShell } from "@/components/layout/page-header"
import { FormActions, FormBody, FormToolbar } from "@/components/shared/form-chrome"
import { SectionCard } from "@/components/shared/section-card"
import { SelectField } from "@/components/shared/select-field"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RichTextEditor } from "@/components/ui/rich-text-editor"
import { CLASSES_OF_BUSINESS, TYPE_OF_COVER, wordingHtml, type ClassOfBusiness, type Clause } from "@/lib/data"

const COB_OPTIONS = ["All", ...CLASSES_OF_BUSINESS]
const LIST_HREF = "/underwriting/master-clauses"

function coverOptions(cob: string) {
  if (cob === "All") return ["Berlaku semua type of cover"]
  const items = TYPE_OF_COVER[cob as ClassOfBusiness] ?? []
  return ["Berlaku semua type of cover", ...items.map((t) => t.label)]
}

export function ClauseForm({ clause, mode }: { clause?: Clause; mode: "new" | "edit" }) {
  const router = useRouter()
  const [title, setTitle] = React.useState(clause?.title ?? "")
  const [cob, setCob] = React.useState<string>(clause?.cob ?? "All")
  const [cover, setCover] = React.useState(clause?.typeOfCover ?? "Berlaku semua type of cover")
  const [wording, setWording] = React.useState(clause ? wordingHtml(clause.wording) : "")

  const words = wording.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length

  function save() {
    if (!title.trim()) {
      toast.error("Judul clause wajib diisi")
      return
    }
    toast.success(mode === "new" ? "Clause baru tersimpan" : "Clause diperbarui", {
      description: "Demo statis — data belum dipersist ke database.",
    })
    router.push(LIST_HREF)
  }

  return (
    <PageShell className="gap-0 p-0">
      <FormToolbar
        title={mode === "new" ? "Clause Baru" : "Edit Clause"}
        backHref={LIST_HREF}
        badge={<Badge variant="secondary">{cob}</Badge>}
        subtitle={title || "Belum ada judul"}
        meta={`${words} kata`}
      />

      <FormBody className="max-w-[980px]">
        <SectionCard title="Identitas Clause">
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel htmlFor="cl-title">Judul Clause *</FieldLabel>
              <Input
                id="cl-title"
                value={title}
                placeholder="Contoh: Machinery Breakdown Clause"
                autoFocus
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <SelectField
                label="Class of Business"
                items={COB_OPTIONS}
                value={cob}
                onValueChange={(v) => {
                  setCob(v)
                  setCover("Berlaku semua type of cover")
                }}
              />
              <SelectField
                label="Type of Cover"
                items={coverOptions(cob)}
                value={cover}
                onValueChange={setCover}
                description="Pilih “Berlaku semua” agar clause tampil di seluruh type of cover."
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Isi Wording Clause"
          description="Format akan ikut terbawa ke placing slip dan dokumen turunan."
        >
          <RichTextEditor
            value={wording}
            onChange={setWording}
            minHeight="26rem"
            placeholder="Tulis wording klausula lengkap — gunakan daftar bernomor untuk sub-ayat."
          />
        </SectionCard>
      </FormBody>

      <FormActions>
        {mode === "edit" ? (
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive" />}>
              <Trash2 data-icon="inline-start" />
              Hapus Clause
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus clause ini?</AlertDialogTitle>
                <AlertDialogDescription>
                  &ldquo;{clause?.title}&rdquo; akan dihapus dari master. Placing slip yang sudah memakai clause ini
                  tidak berubah.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    toast.success("Clause dihapus", { description: "Demo statis." })
                    router.push(LIST_HREF)
                  }}
                >
                  Hapus
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" render={<Link href={LIST_HREF} />} nativeButton={false}>
            Batal
          </Button>
          <Button onClick={save}>
            <Save data-icon="inline-start" />
            Simpan Clause
          </Button>
        </div>
      </FormActions>
    </PageShell>
  )
}
