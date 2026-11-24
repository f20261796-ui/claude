export const STATUS_STYLES: Record<string, string> = {
  awaiting_payment: "bg-bone/10 text-bone/70",
  pending: "bg-amber-400/90 text-ink",
  approved: "bg-emerald-400 text-ink",
  rejected: "bg-[#ff6b6f] text-ink",
};
export const STATUS_LABEL: Record<string, string> = {
  awaiting_payment: "Awaiting payment",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-[10px] font-medium uppercase tracking-wider ${STATUS_STYLES[status] ?? ""}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function fmtDate(s: string) {
  return new Date(s).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" });
}
