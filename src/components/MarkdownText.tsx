import { Fragment, type ReactNode } from "react";

/**
 * Minimal, safe renderer for the Markdown subset the assistant is asked to use:
 * paragraphs, "-" / "1." lists, **bold** and `code`. Everything is rendered as React text
 * nodes, so no HTML from the model or the user is ever interpreted.
 */

type Block =
  | { type: "p"; text: string }
  | { type: "ul" | "ol"; items: string[] };

function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  const state: { paragraph: string[]; list: { type: "ul" | "ol"; items: string[] } | null } = {
    paragraph: [],
    list: null,
  };

  const flushParagraph = () => {
    if (state.paragraph.length > 0) {
      blocks.push({ type: "p", text: state.paragraph.join(" ") });
      state.paragraph = [];
    }
  };
  const flushList = () => {
    if (state.list) {
      blocks.push(state.list);
      state.list = null;
    }
  };

  for (const line of source.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const bullet = /^[-*\u2022]\s+(.*)$/.exec(trimmed);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    const match = bullet ?? numbered;

    if (match) {
      flushParagraph();
      const type = bullet ? "ul" : "ol";
      if (state.list && state.list.type !== type) flushList();
      state.list ??= { type, items: [] };
      state.list.items.push(match[1]);
    } else {
      flushList();
      state.paragraph.push(trimmed);
    }
  }

  flushParagraph();
  flushList();
  return blocks;
}

function renderInline(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
    .filter((part) => part.length > 0)
    .map((part, index) => {
      if (part.length > 4 && part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-semibold text-mist-50">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.length > 2 && part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={index} className="rounded bg-ink-950/70 px-1.5 py-0.5 font-mono text-[0.85em] text-aqua-300">
            {part.slice(1, -1)}
          </code>
        );
      }
      return <Fragment key={index}>{part}</Fragment>;
    });
}

export function MarkdownText({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-[15px] leading-relaxed">
      {parseBlocks(text).map((block, index) => {
        if (block.type === "p") return <p key={index}>{renderInline(block.text)}</p>;
        const ListTag = block.type;
        return (
          <ListTag
            key={index}
            className={`space-y-1.5 pl-5 marker:text-violet-300 ${block.type === "ul" ? "list-disc" : "list-decimal"}`}
          >
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{renderInline(item)}</li>
            ))}
          </ListTag>
        );
      })}
    </div>
  );
}
