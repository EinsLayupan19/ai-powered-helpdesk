import { Fragment, ReactNode } from "react";

/*
  Renders the Markdown-like text Gemini returns: paragraphs, line breaks, **bold**, "- " / "* " bullet
  lists, "1." / "1)" numbered lists, and "#" headings (shown as bold lines). Everything is built as React
  elements, so text is always escaped; no HTML from the answer is ever interpreted. Anything else
  (single asterisks, code, links) stays as plain text.
*/

export type Block =
  | { kind: "p"; lines: string[] }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[]; start: number };

const BULLET = /^\s*[-*•]\s+(.+)$/;
const ORDERED = /^\s*(\d{1,3})[.)]\s+(.+)$/;
const HEADING = /^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/;

export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let current: Block | null = null;
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) { current = null; continue; }
    let m: RegExpExecArray | null;
    if ((m = BULLET.exec(line))) {
      if (current?.kind !== "ul") { current = { kind: "ul", items: [] }; blocks.push(current); }
      current.items.push(m[1]);
    } else if ((m = ORDERED.exec(line))) {
      if (current?.kind !== "ol") { current = { kind: "ol", items: [], start: Number(m[1]) }; blocks.push(current); }
      current.items.push(m[2]);
    } else if ((m = HEADING.exec(line))) {
      blocks.push({ kind: "p", lines: [`**${m[1].replace(/\*\*/g, "")}**`] });
      current = null;
    } else {
      if (current?.kind !== "p") { current = { kind: "p", lines: [] }; blocks.push(current); }
      current.lines.push(line.trim());
    }
  }
  return blocks;
}

/** Turns **bold** spans into <strong>; every other character is rendered as text. */
export function renderInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*\n]+?\*\*)/g).filter(Boolean).map((part, i) =>
    /^\*\*[^*\n]+?\*\*$/.test(part) ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  );
}

export function FormattedText({ text }: { text: string }) {
  return (
    <>
      {parseBlocks(text).map((block, i) => {
        if (block.kind === "ul") return <ul key={i}>{block.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}</ul>;
        if (block.kind === "ol") return <ol key={i} start={block.start === 1 ? undefined : block.start}>{block.items.map((item, j) => <li key={j}>{renderInline(item)}</li>)}</ol>;
        return <p key={i}>{block.lines.map((line, j) => <Fragment key={j}>{j > 0 && <br />}{renderInline(line)}</Fragment>)}</p>;
      })}
    </>
  );
}
