"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, CheckCircle2, Quote, RotateCcw, X } from "lucide-react";
import type { Comment, PostStatus } from "@/lib/types";
import { addTeamComment, setCommentResolved } from "@/app/admin/actions";
import { addClientComment, setClientDecision } from "@/app/r/[token]/actions";
import { useStoredName } from "@/lib/useStoredName";
import { LocalTime } from "./LocalTime";

type Props = {
  postId: string;
  status: PostStatus;
  currentVersion: number;
  comments: Comment[];
  quote: string | null;
  onClearQuote: () => void;
} & ({ mode: "team" } | { mode: "client"; token: string });

export function ReviewPanel(props: Props) {
  const { postId, status, currentVersion, comments, quote, onClearQuote } = props;
  const [body, setBody] = useState("");
  const [name, rememberName] = useStoredName();
  const [error, setError] = useState<string | null>(null);
  const [showResolved, setShowResolved] = useState(false);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isClient = props.mode === "client";

  useEffect(() => {
    if (quote) inputRef.current?.focus();
  }, [quote]);

  function run(fn: () => Promise<void>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        after?.();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  function submit() {
    if (!body.trim()) return;
    if (isClient && !name.trim()) return setError("Add your name so the team knows who commented.");
    run(
      () =>
        props.mode === "client"
          ? addClientComment(props.token, postId, name, body, quote)
          : addTeamComment(postId, body, quote),
      () => {
        setBody("");
        onClearQuote();
      },
    );
  }

  function decide(decision: "approved" | "changes_requested") {
    if (props.mode !== "client") return;
    if (!name.trim()) return setError("Add your name first.");
    if (decision === "changes_requested" && !body.trim()) {
      inputRef.current?.focus();
      return setError("Tell us what to change in the comment box, then click Request changes.");
    }
    run(() => setClientDecision(props.token, postId, name, decision, body), () => {
      setBody("");
      onClearQuote();
    });
  }

  const visible = comments.filter((c) => showResolved || !c.resolved);
  const resolvedCount = comments.filter((c) => c.resolved).length;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">
          Feedback {comments.length > 0 && <span className="font-normal text-zinc-500">({comments.length - resolvedCount} open)</span>}
        </h3>
        {resolvedCount > 0 && (
          <button type="button" onClick={() => setShowResolved(!showResolved)} className="text-xs text-zinc-500 hover:text-zinc-900">
            {showResolved ? "Hide" : "Show"} {resolvedCount} resolved
          </button>
        )}
      </div>

      {visible.length === 0 && (
        <p className="text-sm text-zinc-500">
          {isClient ? "No feedback yet. Select any text in the post to comment on it, or leave a general note below." : "No comments yet."}
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {visible.map((c) => (
          <li key={c.id} className={`rounded-lg border p-3 text-sm ${c.resolved ? "border-zinc-100 bg-zinc-50 opacity-70" : c.author_type === "team" ? "border-blue-100 bg-blue-50/40" : "border-zinc-200 bg-white"}`}>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span className="font-semibold text-zinc-800">{c.author_name}</span>
              {c.author_type === "team" && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-700">Team</span>}
              <LocalTime iso={c.created_at} options={{ month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }} />
              {c.post_version < currentVersion && (
                <span title="The post has been edited since this comment" className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px]">on v{c.post_version}</span>
              )}
              {c.resolved && <span className="flex items-center gap-0.5 text-emerald-700"><CheckCircle2 size={12} /> Resolved</span>}
              {props.mode === "team" && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => setCommentResolved(c.id, !c.resolved))}
                  className="ml-auto flex items-center gap-1 rounded px-1.5 py-0.5 text-zinc-600 hover:bg-zinc-100"
                >
                  {c.resolved ? <><RotateCcw size={12} /> Reopen</> : <><Check size={12} /> Resolve</>}
                </button>
              )}
            </div>
            {c.quote && (
              <blockquote className="mt-2 border-l-2 border-amber-400 bg-amber-50 px-2 py-1 text-xs italic text-zinc-700">“{c.quote}”</blockquote>
            )}
            <p className="mt-1.5 whitespace-pre-wrap text-zinc-800">{c.body}</p>
          </li>
        ))}
      </ul>

      <div className="rounded-lg border border-zinc-200 bg-white p-3 focus-within:border-zinc-400">
        {isClient && (
          <input
            value={name}
            onChange={(e) => rememberName(e.target.value)}
            placeholder="Your name"
            className="mb-2 w-full border-b border-zinc-100 pb-1.5 text-sm outline-none placeholder:text-zinc-400"
          />
        )}
        {quote && (
          <div className="mb-2 flex items-start gap-2 rounded bg-amber-50 px-2 py-1.5 text-xs text-zinc-700">
            <Quote size={12} className="mt-0.5 shrink-0 text-amber-600" />
            <span className="line-clamp-3 flex-1 italic">{quote}</span>
            <button type="button" onClick={onClearQuote} aria-label="Remove quote" className="text-zinc-500 hover:text-zinc-900"><X size={14} /></button>
          </div>
        )}
        <textarea
          ref={inputRef}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
          }}
          rows={3}
          placeholder={quote ? "What should change here?" : isClient ? "Suggest an edit or leave a note…" : "Reply to the client…"}
          className="w-full resize-none text-sm outline-none placeholder:text-zinc-400"
        />
        {error && <p className="mb-2 text-xs text-red-600">{error}</p>}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {isClient && status !== "posted" && (
            <>
              <button
                type="button"
                disabled={pending}
                onClick={() => decide("changes_requested")}
                className="rounded-full border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-50 disabled:opacity-50"
              >
                Request changes
              </button>
              <button
                type="button"
                disabled={pending || status === "approved"}
                onClick={() => decide("approved")}
                className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {status === "approved" ? "Approved" : "Approve"}
              </button>
            </>
          )}
          <button
            type="button"
            disabled={pending || !body.trim()}
            onClick={submit}
            className="rounded-full bg-[#0a66c2] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#004182] disabled:opacity-40"
          >
            {pending ? "Saving…" : "Comment"}
          </button>
        </div>
      </div>
    </div>
  );
}
