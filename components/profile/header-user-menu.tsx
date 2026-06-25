"use client";

import { useRef, useState } from "react";
import { Avatar } from "@/components/profile/avatar";
import { UsernameEditor } from "@/components/profile/username-editor";
import { UsernamePrompt } from "@/components/profile/username-prompt";
import { useUsername } from "@/lib/profile/use-username";

export function HeaderUserMenu() {
  const { username, ready } = useUsername();
  const [editorOpen, setEditorOpen] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  if (!ready) {
    return <span className="h-8 w-8 rounded-full bg-zinc-200 dark:bg-zinc-800" />;
  }

  if (!username) {
    return (
      <>
        <button
          type="button"
          onClick={() => setPromptOpen(true)}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
        >
          Set username
        </button>
        {promptOpen && (
          <UsernamePrompt open onCancel={() => setPromptOpen(false)} />
        )}
      </>
    );
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setEditorOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={editorOpen}
        className="rounded-full focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:focus:ring-zinc-600"
      >
        <Avatar username={username} size={32} />
      </button>
      {editorOpen && (
        <UsernameEditor
          open
          containerRef={menuRef}
          onClose={() => setEditorOpen(false)}
        />
      )}
    </div>
  );
}
