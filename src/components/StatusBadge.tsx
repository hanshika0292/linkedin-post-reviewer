import { STATUS_LABELS, STATUS_STYLES, type PostStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: PostStatus }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]}</span>;
}
