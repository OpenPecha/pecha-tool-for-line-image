"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import { Color } from "@tiptap/extension-color";
import Document from "@tiptap/extension-document";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import TextStyle from "@tiptap/extension-text-style";
import React, { useEffect } from "react";

const TipTapEditor = ({ transcript, setTranscript }) => {
  const editor = useEditor({
    extensions: [Document, Paragraph, Text, TextStyle, Color],
    content: transcript,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      setTranscript(html);
    },
    editable: true,
    editorProps: {
      attributes: {
        class: "p-2",
      },
    },
  });

  // Update editor content if external `transcript` changes
  useEffect(() => {
    if (editor && transcript !== editor.getHTML()) {
      editor.commands.setContent(transcript);
    }
  }, [transcript, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="w-full m-4">
      <div className="flex gap-2">
        <input
          type="color"
          onInput={(event) =>
            editor.chain().focus().setColor(event.target.value).run()
          }
          value={editor.getAttributes("textStyle").color}
          data-testid="setColor"
          className="m-1 border border-black border-solid rounded-md py-[0.1rem] px-[0.4rem] bg-white"
        />
        <button
          onClick={() => editor.chain().focus().setColor("#FF0000").run()}
          className={
            editor.isActive("textStyle", { color: "#FF0000" })
              ? "is-active m-1 border border-black border-solid rounded-md py-[0.1rem] px-[0.4rem]"
              : "m-1 border border-black border-solid rounded-md py-[0.1rem] px-[0.4rem] bg-white"
          }
          data-testid="setRed"
        >
          red
        </button>
        <button
          onClick={() => editor.chain().focus().unsetColor().run()}
          data-testid="unsetColor"
          className="m-1 border border-black border-solid rounded-md py-[0.1rem] px-[0.4rem] bg-white"
        >
          unsetColor
        </button>
      </div>
      <EditorContent
        editor={editor}
        className="font-Jomolhari rounded-md border border-slate-400 w-full h-full text-2xl my-2"
      />
    </div>
  );
};

export default TipTapEditor;
