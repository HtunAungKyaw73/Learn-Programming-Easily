"use client";

import { useState, type KeyboardEvent } from "react";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  placeholder?: string;
}

export function TagInput({
  value,
  onChange,
  label = "Tags",
  placeholder = "Type and press Enter…",
}: TagInputProps) {
  const [input, setInput] = useState("");

  function add() {
    const tag = input.trim().toLowerCase();
    if (tag && !value.includes(tag)) {
      onChange([...value, tag]);
    }
    setInput("");
  }

  function remove(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      add();
    }
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink">
        {label}
      </label>
      <div className="flex flex-wrap gap-2 rounded-md border border-border bg-surface p-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-terracotta/10 px-3 py-1 text-xs font-medium text-terracotta"
          >
            #{tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="ml-0.5 text-terracotta/60 hover:text-terracotta"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ""}
          className="min-w-[120px] flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-faint"
        />
      </div>
    </div>
  );
}
