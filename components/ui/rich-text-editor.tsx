"use client"

import * as React from "react"
import { EditorContent, useEditor, type Editor } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

interface ToolItem {
  icon: LucideIcon
  label: string
  run: (editor: Editor) => void
  active?: (editor: Editor) => boolean
}

const MARKS: ToolItem[] = [
  { icon: Bold, label: "Tebal", run: (e) => e.chain().focus().toggleBold().run(), active: (e) => e.isActive("bold") },
  { icon: Italic, label: "Miring", run: (e) => e.chain().focus().toggleItalic().run(), active: (e) => e.isActive("italic") },
  {
    icon: UnderlineIcon,
    label: "Garis bawah",
    run: (e) => e.chain().focus().toggleUnderline().run(),
    active: (e) => e.isActive("underline"),
  },
  {
    icon: Strikethrough,
    label: "Coret",
    run: (e) => e.chain().focus().toggleStrike().run(),
    active: (e) => e.isActive("strike"),
  },
]

const BLOCKS: ToolItem[] = [
  {
    icon: Heading2,
    label: "Sub-judul",
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    active: (e) => e.isActive("heading", { level: 2 }),
  },
  {
    icon: Heading3,
    label: "Sub-sub-judul",
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    active: (e) => e.isActive("heading", { level: 3 }),
  },
  {
    icon: List,
    label: "Daftar bullet",
    run: (e) => e.chain().focus().toggleBulletList().run(),
    active: (e) => e.isActive("bulletList"),
  },
  {
    icon: ListOrdered,
    label: "Daftar bernomor",
    run: (e) => e.chain().focus().toggleOrderedList().run(),
    active: (e) => e.isActive("orderedList"),
  },
  {
    icon: Quote,
    label: "Kutipan",
    run: (e) => e.chain().focus().toggleBlockquote().run(),
    active: (e) => e.isActive("blockquote"),
  },
]

function ToolButton({ item, editor }: { item: ToolItem; editor: Editor }) {
  const active = item.active?.(editor) ?? false
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={item.label}
      aria-pressed={active}
      title={item.label}
      className={cn("rounded-md", active && "bg-muted text-foreground")}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => item.run(editor)}
    >
      <item.icon />
    </Button>
  )
}

/**
 * Editor wording klausula. Menyimpan HTML — wording asuransi butuh penomoran,
 * penekanan, dan indentasi yang hilang kalau disimpan sebagai plain text.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = "Tulis wording klausula…",
  minHeight = "22rem",
  className,
}: {
  value: string
  onChange?: (html: string) => void
  placeholder?: string
  minHeight?: string
  className?: string
}) {
  const editor = useEditor({
    extensions: [StarterKit.configure({ link: { openOnClick: false } })],
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "rte-content focus:outline-none",
        style: `min-height:${minHeight}`,
        "aria-label": placeholder,
      },
    },
    onUpdate: ({ editor }) => onChange?.(editor.getHTML()),
  })

  if (!editor) {
    return (
      <div
        className={cn("bg-input/50 animate-pulse rounded-lg border border-transparent", className)}
        style={{ minHeight: `calc(${minHeight} + 2.75rem)` }}
      />
    )
  }

  const empty = editor.isEmpty

  return (
    <div
      className={cn(
        "focus-within:border-ring focus-within:ring-ring/30 overflow-hidden rounded-lg border transition-[box-shadow,border-color] focus-within:ring-3",
        className
      )}
    >
      <div className="bg-muted/40 flex flex-wrap items-center gap-0.5 border-b px-1.5 py-1">
        {MARKS.map((item) => (
          <ToolButton key={item.label} item={item} editor={editor} />
        ))}
        <Separator orientation="vertical" className="mx-1 h-5" />
        {BLOCKS.map((item) => (
          <ToolButton key={item.label} item={item} editor={editor} />
        ))}
        <Separator orientation="vertical" className="mx-1 h-5" />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Hapus format"
          title="Hapus format"
          className="rounded-md"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        >
          <RemoveFormatting />
        </Button>
        <div className="ml-auto flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Undo"
            title="Undo"
            className="rounded-md"
            disabled={!editor.can().undo()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().undo().run()}
          >
            <Undo2 />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Redo"
            title="Redo"
            className="rounded-md"
            disabled={!editor.can().redo()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => editor.chain().focus().redo().run()}
          >
            <Redo2 />
          </Button>
        </div>
      </div>

      <div className="relative">
        {empty ? (
          <p className="text-muted-foreground pointer-events-none absolute top-4 left-4 text-sm">{placeholder}</p>
        ) : null}
        <EditorContent editor={editor} className="[&_.ProseMirror]:px-4 [&_.ProseMirror]:py-4" />
      </div>
    </div>
  )
}
