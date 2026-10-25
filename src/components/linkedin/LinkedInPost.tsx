"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  MessageSquareText,
  MessageSquarePlus,
  MoreHorizontal,
  Repeat2,
  Send,
  ThumbsUp,
  FileText,
} from "lucide-react";
import type { Person, PostMedia } from "@/lib/types";

export type Device = "desktop" | "mobile";

export const DEVICE_WIDTH: Record<Device, number> = { desktop: 555, mobile: 390 };

type Props = {
  person: Pick<Person, "name" | "headline" | "avatar_url">;
  body: string;
  media: PostMedia;
  device?: Device;
  /** Start expanded (skip the "…more" truncation). */
  expanded?: boolean;
  /** When provided, selecting text in the post shows a "Comment" button that calls this. */
  onQuote?: (text: string) => void;
};

// A faithful-enough rendering of a LinkedIn feed post: header, truncated text with
// "…more", hashtags/mentions/links, and every attachment type LinkedIn supports.
export function LinkedInPost({ person, body, media, device = "desktop", expanded, onQuote }: Props) {
  return (
    <article
      className="li-post overflow-hidden rounded-lg border border-[#e0dfdc] bg-white text-[rgba(0,0,0,0.9)] shadow-[0_0_0_1px_rgba(0,0,0,0.04)]"
      style={{ width: "100%", maxWidth: DEVICE_WIDTH[device] }}
    >
      <Header person={person} />
      <PostText body={body} expanded={expanded} onQuote={onQuote} />
      <Media media={media} />
      <ActionBar device={device} />
    </article>
  );
}

function Header({ person }: { person: Props["person"] }) {
  return (
    <div className="flex items-start gap-2 px-4 pt-3">
      <Avatar name={person.name} url={person.avatar_url} size={48} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14px] font-semibold leading-5">{person.name || "Name"}</div>
        <div className="line-clamp-1 text-[12px] leading-4 text-[rgba(0,0,0,0.6)]">{person.headline}</div>
        <div className="flex items-center gap-1 text-[12px] leading-4 text-[rgba(0,0,0,0.6)]">
          Now <span aria-hidden>•</span> <Globe size={12} aria-label="Visible to anyone" />
        </div>
      </div>
      <MoreHorizontal size={22} className="mt-1 text-[rgba(0,0,0,0.6)]" aria-hidden />
    </div>
  );
}

export function Avatar({ name, url, size }: { name: string; url: string | null; size: number }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-[#dce6f1] font-semibold text-[#0a66c2]"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden
    >
      {initials || "?"}
    </div>
  );
}

// ---------- Text ----------

// @[Full Name] → mention, #tag → hashtag, http(s)://… → link
const TOKEN_RE = /(@\[[^\]]+\]|#[\p{L}\p{N}_]+|https?:\/\/[^\s]+)/gu;

function renderRichText(text: string): ReactNode[] {
  return text.split(TOKEN_RE).map((part, i) => {
    if (i % 2 === 0) return part;
    const label = part.startsWith("@[") ? part.slice(2, -1) : part;
    return (
      <span key={i} className="font-semibold text-[#0a66c2]">
        {label}
      </span>
    );
  });
}

function PostText({ body, expanded: startExpanded, onQuote }: { body: string; expanded?: boolean; onQuote?: (t: string) => void }) {
  const [expanded, setExpanded] = useState(!!startExpanded);
  const [overflows, setOverflows] = useState(false);
  const [selection, setSelection] = useState<{ text: string; top: number; left: number } | null>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el || expanded) return;
    const check = () => setOverflows(el.scrollHeight > el.clientHeight + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [body, expanded]);

  useEffect(() => {
    if (!onQuote) return;
    const clear = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) setSelection(null);
    };
    document.addEventListener("selectionchange", clear);
    return () => document.removeEventListener("selectionchange", clear);
  }, [onQuote]);

  function captureSelection() {
    if (!onQuote) return;
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!sel || !text || !textRef.current?.contains(sel.anchorNode)) return;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    const box = wrapRef.current!.getBoundingClientRect();
    setSelection({ text, top: rect.top - box.top - 36, left: Math.max(0, rect.left - box.left + rect.width / 2 - 50) });
  }

  if (!body.trim()) return <div className="h-2" />;

  return (
    <div ref={wrapRef} className="relative px-4 pb-2 pt-3">
      <div
        ref={textRef}
        onMouseUp={captureSelection}
        onTouchEnd={() => setTimeout(captureSelection, 50)}
        className={`whitespace-pre-wrap break-words text-[14px] leading-5 ${expanded ? "" : "line-clamp-3"}`}
      >
        {renderRichText(body)}
      </div>
      {!expanded && overflows && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="absolute bottom-2 right-4 bg-white pl-1 text-[14px] leading-5 text-[rgba(0,0,0,0.6)] hover:text-[#0a66c2] hover:underline"
        >
          …more
        </button>
      )}
      {selection && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onQuote?.(selection.text);
            setSelection(null);
            window.getSelection()?.removeAllRanges();
          }}
          className="absolute z-10 flex items-center gap-1 rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg"
          style={{ top: selection.top, left: selection.left }}
        >
          <MessageSquarePlus size={14} /> Comment
        </button>
      )}
    </div>
  );
}

// ---------- Media ----------

function Media({ media }: { media: PostMedia }) {
  switch (media.kind) {
    case "images":
      return media.images.length ? <ImageGrid images={media.images} /> : null;
    case "video":
      return media.url ? (
        <video src={media.url} poster={media.poster} controls playsInline className="mt-1 max-h-[620px] w-full bg-black" />
      ) : null;
    case "document":
      return media.pages.length ? <DocumentCarousel title={media.title} pages={media.pages} /> : null;
    case "link":
      return media.url ? <LinkCard {...media} /> : null;
    case "poll":
      return <Poll {...media} />;
    default:
      return null;
  }
}

function Img({ src, alt, className, overlay }: { src: string; alt?: string; className?: string; overlay?: string }) {
  return (
    <div className={`relative overflow-hidden bg-zinc-100 ${className ?? ""}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt ?? ""} className="h-full w-full object-cover" />
      {overlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-3xl font-semibold text-white">{overlay}</div>
      )}
    </div>
  );
}

// Matches LinkedIn's multi-image layouts: 1 full, 2 side-by-side, 3–4 hero + row, 5+ 2 over 3 with "+N".
function ImageGrid({ images }: { images: { url: string; alt?: string }[] }) {
  const n = images.length;
  if (n === 1) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={images[0].url} alt={images[0].alt ?? ""} className="mt-1 max-h-[640px] w-full bg-zinc-100 object-contain" />
    );
  }
  if (n === 2) {
    return (
      <div className="mt-1 grid grid-cols-2 gap-0.5">
        {images.map((im, i) => <Img key={i} src={im.url} alt={im.alt} className="aspect-square" />)}
      </div>
    );
  }
  if (n <= 4) {
    const rest = images.slice(1);
    return (
      <div className="mt-1 flex flex-col gap-0.5">
        <Img src={images[0].url} alt={images[0].alt} className="aspect-[16/10]" />
        <div className={`grid gap-0.5 ${rest.length === 2 ? "grid-cols-2" : "grid-cols-3"}`}>
          {rest.map((im, i) => <Img key={i} src={im.url} alt={im.alt} className="aspect-square" />)}
        </div>
      </div>
    );
  }
  const top = images.slice(0, 2);
  const bottom = images.slice(2, 5);
  return (
    <div className="mt-1 flex flex-col gap-0.5">
      <div className="grid grid-cols-2 gap-0.5">
        {top.map((im, i) => <Img key={i} src={im.url} alt={im.alt} className="aspect-square" />)}
      </div>
      <div className="grid grid-cols-3 gap-0.5">
        {bottom.map((im, i) => (
          <Img key={i} src={im.url} alt={im.alt} className="aspect-square" overlay={i === 2 && n > 5 ? `+${n - 5}` : undefined} />
        ))}
      </div>
    </div>
  );
}

function DocumentCarousel({ title, pages }: { title: string; pages: string[] }) {
  const [page, setPage] = useState(0);
  const last = pages.length - 1;
  return (
    <div className="mt-1 border-y border-[#e0dfdc]">
      <div className="flex items-center gap-2 bg-[#1d2226] px-3 py-2 text-[13px] text-white">
        <FileText size={14} />
        <span className="truncate font-semibold">{title || "Document"}</span>
        <span className="text-white/70">• {pages.length} pages</span>
      </div>
      <div className="group relative bg-zinc-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={pages[page]} alt={`Page ${page + 1}`} className="aspect-[4/5] w-full object-contain" />
        {page > 0 && (
          <button type="button" aria-label="Previous page" onClick={() => setPage(page - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white">
            <ChevronLeft size={20} />
          </button>
        )}
        {page < last && (
          <button type="button" aria-label="Next page" onClick={() => setPage(page + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2 text-white">
            <ChevronRight size={20} />
          </button>
        )}
      </div>
      <div className="flex items-center gap-3 bg-[#1d2226] px-3 py-2 text-[12px] text-white">
        <span className="tabular-nums">{page + 1} / {pages.length}</span>
        <div className="h-1 flex-1 rounded bg-white/25">
          <div className="h-1 rounded bg-white" style={{ width: `${((page + 1) / pages.length) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

function LinkCard({ url, title, domain, image }: { url: string; title: string; domain: string; image?: string }) {
  return (
    <a href={url} target="_blank" rel="noreferrer" className="mt-1 block">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="aspect-[1.91/1] w-full bg-zinc-100 object-cover" />
      )}
      <div className="bg-[#eef3f8] px-3 py-2">
        <div className="line-clamp-2 text-[14px] font-semibold leading-5">{title || url}</div>
        <div className="text-[12px] text-[rgba(0,0,0,0.6)]">{domain}</div>
      </div>
    </a>
  );
}

const POLL_DURATION: Record<string, string> = { "1d": "1d left", "3d": "3d left", "1w": "1w left", "2w": "2w left" };

function Poll({ question, options, duration }: { question: string; options: string[]; duration: string }) {
  const [voted, setVoted] = useState<number | null>(null);
  return (
    <div className="mx-4 mb-2 mt-1 rounded-lg border border-[#e0dfdc] p-3">
      <div className="text-[12px] text-[rgba(0,0,0,0.6)]">The author can see how you vote. <span className="font-semibold text-[#0a66c2]">Learn more</span></div>
      <div className="mt-1 text-[14px] font-semibold">{question || "Poll question"}</div>
      <div className="mt-3 flex flex-col gap-2">
        {options.filter(Boolean).map((opt, i) =>
          voted === null ? (
            <button
              key={i}
              type="button"
              onClick={() => setVoted(i)}
              className="rounded-full border border-[#0a66c2] px-4 py-1.5 text-[14px] font-semibold text-[#0a66c2] hover:bg-[#ebf4fd] hover:shadow-[inset_0_0_0_1px_#0a66c2]"
            >
              {opt}
            </button>
          ) : (
            <div key={i} className="relative overflow-hidden rounded-md bg-zinc-100 px-3 py-1.5 text-[14px]">
              <div className="absolute inset-y-0 left-0 bg-[#d0e8ff]" style={{ width: voted === i ? "100%" : "0%" }} />
              <div className="relative flex justify-between font-semibold">
                <span>{opt}</span>
                <span>{voted === i ? "100%" : "0%"}</span>
              </div>
            </div>
          ),
        )}
      </div>
      <div className="mt-2 text-[12px] text-[rgba(0,0,0,0.6)]">
        {voted === null ? 0 : 1} votes • {POLL_DURATION[duration] ?? "1w left"}
        {voted !== null && (
          <button type="button" className="ml-2 font-semibold text-[#0a66c2]" onClick={() => setVoted(null)}>Undo</button>
        )}
      </div>
    </div>
  );
}

// ---------- Actions ----------

function ActionBar({ device }: { device: Device }) {
  const actions = [
    { icon: ThumbsUp, label: "Like" },
    { icon: MessageSquareText, label: "Comment" },
    { icon: Repeat2, label: "Repost" },
    { icon: Send, label: "Send" },
  ];
  return (
    <div className="mx-4 flex justify-between border-t border-[#e0dfdc] py-1">
      {actions.map(({ icon: Icon, label }) => (
        <div
          key={label}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded px-2 py-2.5 text-[rgba(0,0,0,0.6)] ${device === "mobile" ? "flex-col gap-0.5 text-[11px]" : "text-[14px] font-semibold"}`}
        >
          <Icon size={device === "mobile" ? 18 : 20} strokeWidth={1.8} />
          {label}
        </div>
      ))}
    </div>
  );
}
