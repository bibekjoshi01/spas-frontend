import { useEffect } from "react"
import { EditorContent, useEditor, useEditorState } from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import {
  Bold,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Pilcrow,
  Redo2,
  Undo2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import type { AssignmentDocument } from "@/lib/api"

import {
  EMPTY_ASSIGNMENT_DESCRIPTION,
  ASSIGNMENT_CONTENT_STYLES,
} from "@/lib/utils/assignment"

export function AssignmentDescriptionEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: AssignmentDocument
  onChange: (value: AssignmentDocument) => void
  disabled?: boolean
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        italic: false,
        strike: false,
        underline: false,
        link: false,
      }),
    ],
    content: value.type === "doc" ? value : EMPTY_ASSIGNMENT_DESCRIPTION,
    onUpdate: ({ editor }) => onChange(editor.getJSON()),
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": "Task description",
        "aria-multiline": "true",
        class: `${ASSIGNMENT_CONTENT_STYLES} min-h-40 px-3 py-2 outline-none`,
      },
    },
  })
  useEffect(() => {
    editor?.setEditable(!disabled)
  }, [editor, disabled])
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold"),
      heading2: editor?.isActive("heading", { level: 2 }),
      heading3: editor?.isActive("heading", { level: 3 }),
      paragraph: editor?.isActive("paragraph"),
      bulletList: editor?.isActive("bulletList"),
      orderedList: editor?.isActive("orderedList"),
    }),
  })
  const tools = [
    {
      label: "Paragraph",
      icon: Pilcrow,
      active: active?.paragraph,
      run: () => editor?.chain().focus().setParagraph().run(),
    },
    {
      label: "Heading",
      icon: Heading2,
      active: active?.heading2,
      run: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "Subheading",
      icon: Heading3,
      active: active?.heading3,
      run: () => editor?.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    {
      label: "Bold",
      icon: Bold,
      active: active?.bold,
      run: () => editor?.chain().focus().toggleBold().run(),
    },
    {
      label: "Bullet list",
      icon: List,
      active: active?.bulletList,
      run: () => editor?.chain().focus().toggleBulletList().run(),
    },
    {
      label: "Numbered list",
      icon: ListOrdered,
      active: active?.orderedList,
      run: () => editor?.chain().focus().toggleOrderedList().run(),
    },
    {
      label: "Undo",
      icon: Undo2,
      run: () => editor?.chain().focus().undo().run(),
    },
    {
      label: "Redo",
      icon: Redo2,
      run: () => editor?.chain().focus().redo().run(),
    },
  ]
  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <div
        role="toolbar"
        aria-label="Task description formatting"
        className="flex flex-wrap gap-1 border-b bg-muted/40 p-1"
      >
        {tools.map(({ label, icon: Icon, active, run }) => (
          <Button
            key={label}
            type="button"
            size="icon"
            variant={active ? "secondary" : "ghost"}
            className="size-8"
            aria-label={label}
            aria-pressed={active}
            title={label}
            disabled={disabled || !editor}
            onClick={run}
          >
            <Icon className="size-4" aria-hidden />
          </Button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
