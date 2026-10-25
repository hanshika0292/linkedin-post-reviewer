"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FileText,
  ImageIcon,
  Link2,
  Loader2,
  Type,
  Video,
  X,
} from "lucide-react";
import { LinkedInPost, type Device } from "@/components/linkedin/LinkedInPost";
import { DeviceToggle } from "@/components/DeviceToggle";
import { ReviewPanel } from "@/components/ReviewPanel";
import { ConfirmButton } from "@/components/admin/ConfirmButton";
import { uploadFile } from "@/lib/upload";
import {
  MAX_POST_CHARS,
  STATUS_LABELS,
  type Comment,
  type Org,
  type Person,
  type Post,
  type PostMedia,
  type PostStatus,
} from "@/lib/types";
import { deletePost, fetchLinkPreview, savePost } from "../../actions";

type Kind = PostMedia["kind"];

const KINDS: { kind: Kind; label: string; icon: typeof Type }[] = [
  { kind: "none", label: "Text only", icon: Type },
  { kind: "images", label: "Images", icon: ImageIcon },
  { kind: "video", label: "Video", icon: Video },
  { kind: "document", label: "Document", icon: FileText },
  { kind: "link", label: "Link", icon: Link2 },
  { kind: "poll", label: "Poll", icon: BarChart3 },
];

const EMPTY: { [K in Kind]: Extract<PostMedia, { kind: K }> } = {
  none: { kind: "none" },
  images: { kind: "images", images: [] },
  video: { kind: "video", url: "" },
  document: { kind: "document", title: "", pages: [] },
  link: { kind: "link", url: "", title: "", domain: "" },
  poll: { kind: "poll", question: "", options: ["", ""], duration: "1w" },
};

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PostEditor({ post, person, org, comments }: { post: Post; person: Person; org: Org; comments: Comment[] }) {
  const [body, setBody] = useState(post.body);
  const [media, setMedia] = useState<PostMedia>(post.media ?? EMPTY.none);
  // Remember what was entered per attachment type so switching tabs doesn't lose work.
  const [stash, setStash] = useState<Partial<Record<Kind, PostMedia>>>({});
  const [status, setStatus] = useState<PostStatus>(post.status);
  const [schedule, setSchedule] = useState(toLocalInput(post.scheduled_for));
  const [device, setDevice] = useState<Device>("desktop");
  const [quote, setQuote] = useState<string | null>(null);
  const [saved, setSaved] = useState({ body: post.body, media: post.media, status: post.status, schedule: toLocalInput(post.scheduled_for) });
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();

  const dirty =
    body !== saved.body || JSON.stringify(media) !== JSON.stringify(saved.media) || status !== saved.status || schedule !== saved.schedule;

  function save(nextStatus = status) {
    setError(null);
    startSave(async () => {
      try {
        await savePost(post.id, {
          body,
          media,
          status: nextStatus,
          scheduled_for: schedule ? new Date(schedule).toISOString() : null,
        });
        setStatus(nextStatus);
        setSaved({ body, media, status: nextStatus, schedule });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        saveRef.current();
      }
    };
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [dirty]);

  function switchKind(kind: Kind) {
    if (kind === media.kind) return;
    setStash((s) => ({ ...s, [media.kind]: media }));
    setMedia(stash[kind] ?? EMPTY[kind]);
  }

  const over = body.length > MAX_POST_CHARS;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href={`/admin/orgs/${org.id}`} className="text-sm text-zinc-500 hover:text-zinc-900">← {org.name}</Link>
          <h1 className="text-lg font-semibold">Post for {person.name} <span className="text-sm font-normal text-zinc-400">v{post.version}</span></h1>
        </div>
        <div className="flex items-center gap-2">
          {error && <span className="text-sm text-red-600">{error}</span>}
          <span className="text-xs text-zinc-500">{saving ? "Saving…" : dirty ? "Unsaved changes" : "Saved"}</span>
          {status === "draft" && (
            <button
              type="button"
              disabled={saving || over}
              onClick={() => save("in_review")}
              className="rounded-full border border-[#0a66c2] px-4 py-1.5 text-sm font-semibold text-[#0a66c2] hover:bg-[#ebf4fd] disabled:opacity-50"
            >
              Save & send for review
            </button>
          )}
          <button
            type="button"
            disabled={saving || over || !dirty}
            onClick={() => save()}
            className="rounded-full bg-[#0a66c2] px-4 py-1.5 text-sm font-semibold text-white hover:bg-[#004182] disabled:opacity-40"
          >
            Save
          </button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,555px)]">
        {/* ------- Editor ------- */}
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={14}
              placeholder="What do you want to talk about?"
              className="w-full resize-y text-[15px] leading-6 outline-none placeholder:text-zinc-400"
            />
            <div className="mt-2 flex items-center justify-between border-t border-zinc-100 pt-2 text-xs text-zinc-500">
              <span>Use <code>#hashtag</code> and <code>@[Full Name]</code> for mentions.</span>
              <span className={over ? "font-semibold text-red-600" : ""}>{body.length} / {MAX_POST_CHARS}</span>
            </div>
          </div>

          <div className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap gap-1">
              {KINDS.map(({ kind, label, icon: Icon }) => (
                <button
                  key={kind}
                  type="button"
                  onClick={() => switchKind(kind)}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs ${media.kind === kind ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"}`}
                >
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
            <MediaEditor media={media} onChange={setMedia} />
          </div>

          <div className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-zinc-600">Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value as PostStatus)} className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm">
                {(Object.keys(STATUS_LABELS) as PostStatus[]).map((s) => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}{s === "draft" ? " (hidden from client)" : ""}</option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="text-zinc-600">Scheduled for</span>
              <input type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-300 px-2 py-1.5 text-sm" />
            </label>
          </div>

          <ConfirmButton action={deletePost.bind(null, post.id)} label="Delete post" className="self-start text-xs text-zinc-500 hover:text-red-600" />
        </div>

        {/* ------- Preview + feedback ------- */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Live preview</span>
            <DeviceToggle value={device} onChange={setDevice} />
          </div>
          <div className="flex justify-center">
            <LinkedInPost person={person} body={body} media={media} device={device} onQuote={setQuote} />
          </div>
          <div className="rounded-lg border border-zinc-200 bg-white/70 p-4">
            <ReviewPanel
              mode="team"
              postId={post.id}
              status={status}
              currentVersion={post.version}
              comments={comments}
              quote={quote}
              onClearQuote={() => setQuote(null)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Attachment editors ----------

function MediaEditor({ media, onChange }: { media: PostMedia; onChange: (m: PostMedia) => void }) {
  switch (media.kind) {
    case "none":
      return <p className="text-sm text-zinc-500">No attachment. Pick a type above to add images, a video, a document carousel, a link, or a poll.</p>;
    case "images":
      return (
        <ImageList
          urls={media.images.map((i) => i.url)}
          onChange={(urls) => onChange({ kind: "images", images: urls.map((url) => ({ url })) })}
          hint="Up to 20 images. Layout matches LinkedIn: 1, 2, 3–4, or 5+ (shows +N)."
          max={20}
        />
      );
    case "video":
      return (
        <div className="flex flex-col gap-2">
          <Uploader accept="video/*" label={media.url ? "Replace video" : "Upload video"} onUploaded={([url]) => onChange({ ...media, url })} />
          {media.url && <button type="button" onClick={() => onChange({ kind: "video", url: "" })} className="self-start text-xs text-zinc-500 hover:text-red-600">Remove video</button>}
        </div>
      );
    case "document":
      return (
        <div className="flex flex-col gap-3">
          <input
            value={media.title}
            onChange={(e) => onChange({ ...media, title: e.target.value })}
            placeholder="Document title (shown on the carousel)"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-[#0a66c2]"
          />
          <ImageList
            urls={media.pages}
            onChange={(pages) => onChange({ ...media, pages })}
            hint="Upload each page/slide as an image, in order (export your PDF pages as PNG/JPG)."
            max={300}
          />
        </div>
      );
    case "link":
      return <LinkEditor media={media} onChange={onChange} />;
    case "poll":
      return (
        <div className="flex flex-col gap-2">
          <input
            value={media.question}
            maxLength={140}
            onChange={(e) => onChange({ ...media, question: e.target.value })}
            placeholder="Your question"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-[#0a66c2]"
          />
          {media.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={opt}
                maxLength={30}
                onChange={(e) => onChange({ ...media, options: media.options.map((o, j) => (j === i ? e.target.value : o)) })}
                placeholder={`Option ${i + 1}`}
                className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-[#0a66c2]"
              />
              {media.options.length > 2 && (
                <button type="button" aria-label="Remove option" onClick={() => onChange({ ...media, options: media.options.filter((_, j) => j !== i) })} className="text-zinc-400 hover:text-red-600"><X size={16} /></button>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between">
            {media.options.length < 4 ? (
              <button type="button" onClick={() => onChange({ ...media, options: [...media.options, ""] })} className="text-xs font-semibold text-[#0a66c2]">+ Add option</button>
            ) : <span />}
            <select value={media.duration} onChange={(e) => onChange({ ...media, duration: e.target.value as typeof media.duration })} className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-xs">
              <option value="1d">1 day</option>
              <option value="3d">3 days</option>
              <option value="1w">1 week</option>
              <option value="2w">2 weeks</option>
            </select>
          </div>
        </div>
      );
  }
}

function Uploader({ accept, multiple, label, onUploaded }: { accept: string; multiple?: boolean; label: string; onUploaded: (urls: string[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div>
      <label className={`inline-flex cursor-pointer items-center gap-2 rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-semibold hover:bg-zinc-50 ${busy ? "pointer-events-none opacity-60" : ""}`}>
        {busy && <Loader2 size={13} className="animate-spin" />} {busy ? "Uploading…" : label}
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={async (e) => {
            const files = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (!files.length) return;
            setBusy(true);
            setErr(null);
            try {
              onUploaded(await Promise.all(files.map(uploadFile)));
            } catch (ex) {
              setErr(ex instanceof Error ? ex.message : "Upload failed");
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}

function ImageList({ urls, onChange, hint, max }: { urls: string[]; onChange: (u: string[]) => void; hint: string; max: number }) {
  const move = (i: number, d: -1 | 1) => {
    const next = [...urls];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };
  return (
    <div className="flex flex-col gap-3">
      {urls.length > 0 && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {urls.map((url, i) => (
            <div key={url + i} className="group relative aspect-square overflow-hidden rounded-md border border-zinc-200 bg-zinc-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[10px] text-white">{i + 1}</span>
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 p-0.5 opacity-0 transition group-hover:opacity-100">
                <button type="button" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move left" className="text-white disabled:opacity-30"><ChevronLeft size={16} /></button>
                <button type="button" onClick={() => onChange(urls.filter((_, j) => j !== i))} aria-label="Remove" className="text-white"><X size={16} /></button>
                <button type="button" disabled={i === urls.length - 1} onClick={() => move(i, 1)} aria-label="Move right" className="text-white disabled:opacity-30"><ChevronRight size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {urls.length < max && <Uploader accept="image/*" multiple label="Add images" onUploaded={(u) => onChange([...urls, ...u].slice(0, max))} />}
      <p className="text-xs text-zinc-500">{hint}</p>
    </div>
  );
}

function LinkEditor({ media, onChange }: { media: Extract<PostMedia, { kind: "link" }>; onChange: (m: PostMedia) => void }) {
  const [url, setUrl] = useState(media.url);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  function fetchPreview() {
    setErr(null);
    start(async () => {
      try {
        const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
        const meta = await fetchLinkPreview(normalized);
        onChange({ kind: "link", url: normalized, title: meta.title, domain: meta.domain, image: meta.image });
        setUrl(normalized);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Couldn't fetch that link");
      }
    });
  }
  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchPreview()}
          placeholder="https://…"
          className="flex-1 rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-[#0a66c2]"
        />
        <button type="button" disabled={pending || !url.trim()} onClick={fetchPreview} className="rounded-full border border-zinc-300 px-4 py-1.5 text-xs font-semibold hover:bg-zinc-50 disabled:opacity-50">
          {pending ? "Fetching…" : "Fetch preview"}
        </button>
      </div>
      {err && <p className="text-xs text-red-600">{err}</p>}
      {media.url && (
        <>
          <input
            value={media.title}
            onChange={(e) => onChange({ ...media, title: e.target.value })}
            placeholder="Card title"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm outline-none focus:border-[#0a66c2]"
          />
          <div className="flex items-center gap-2">
            <Uploader accept="image/*" label={media.image ? "Replace card image" : "Upload card image"} onUploaded={([image]) => onChange({ ...media, image })} />
            {media.image && <button type="button" onClick={() => onChange({ ...media, image: undefined })} className="text-xs text-zinc-500 hover:text-red-600">Remove image</button>}
          </div>
        </>
      )}
    </div>
  );
}
