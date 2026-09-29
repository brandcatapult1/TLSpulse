"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import clsx from "clsx";
import { Bold, Italic, Link2, List, ListOrdered, RemoveFormatting, Underline } from "lucide-react";
import { useEffect } from "react";

/** Small rich-text editor for shoot notes: bold, italic, underline, lists, links. Emits HTML ("" when empty). */
export function RichTextEditor({ value, onChange, placeholder, id }: { value: string; onChange: (html: string) => void; placeholder?: string; id?: string }) {
  const editor = useEditor({
    immediatelyRender: false, // avoid SSR hydration mismatch
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: true, defaultProtocol: "https" },
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        ...(id ? { id } : {}),
        "aria-label": "Notes",
        "aria-multiline": "true",
        role: "textbox",
        class: "rich-text min-h-24 px-3 py-2 text-base outline-none sm:text-sm",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.isEmpty ? "" : editor.getHTML()),
  });

  // Keep in sync when the form loads a different shoot.
  useEffect(() => {
    if (editor && !editor.isFocused && value !== (editor.isEmpty ? "" : editor.getHTML())) editor.commands.setContent(value || "", { emitUpdate: false });
  }, [editor, value]);

  const state = useEditorState({
    editor,
    selector: ({ editor: e }) =>
      e
        ? {
            bold: e.isActive("bold"),
            italic: e.isActive("italic"),
            underline: e.isActive("underline"),
            bullet: e.isActive("bulletList"),
            ordered: e.isActive("orderedList"),
            link: e.isActive("link"),
            empty: e.isEmpty,
          }
        : null,
  });

  function setLink() {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (leave empty to remove)", prev ?? "https://");
    if (url === null) return;
    if (!url.trim() || url.trim() === "https://") editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  const btn = (active: boolean | undefined, label: string, onClick: () => void, icon: React.ReactNode) => (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={!!active}
      onMouseDown={(e) => e.preventDefault()} // keep the selection in the editor
      onClick={onClick}
      className={clsx("grid h-7 w-7 place-items-center rounded-md transition-colors", active ? "bg-ink text-surface" : "text-muted hover:bg-soft hover:text-ink")}
    >
      {icon}
    </button>
  );

  return (
    <div className="rounded-lg border border-line bg-surface focus-within:border-ink/40 focus-within:ring-4 focus-within:ring-ink/5">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line px-1.5 py-1">
        {btn(state?.bold, "Bold (⌘B)", () => editor?.chain().focus().toggleBold().run(), <Bold size={14} />)}
        {btn(state?.italic, "Italic (⌘I)", () => editor?.chain().focus().toggleItalic().run(), <Italic size={14} />)}
        {btn(state?.underline, "Underline (⌘U)", () => editor?.chain().focus().toggleUnderline().run(), <Underline size={14} />)}
        <span className="mx-1 h-4 w-px bg-line" />
        {btn(state?.bullet, "Bullet list", () => editor?.chain().focus().toggleBulletList().run(), <List size={14} />)}
        {btn(state?.ordered, "Numbered list", () => editor?.chain().focus().toggleOrderedList().run(), <ListOrdered size={14} />)}
        <span className="mx-1 h-4 w-px bg-line" />
        {btn(state?.link, "Link", setLink, <Link2 size={14} />)}
        {btn(false, "Clear formatting", () => editor?.chain().focus().unsetAllMarks().clearNodes().run(), <RemoveFormatting size={14} />)}
      </div>
      <div className="relative">
        {state?.empty && placeholder && <span className="pointer-events-none absolute top-2 left-3 text-base text-muted/70 sm:text-sm">{placeholder}</span>}
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
