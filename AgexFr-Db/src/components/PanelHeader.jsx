export function PanelHeader({ label, sub, right }) {
  return (
    <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded border border-border-bright font-mono text-[10px] text-slate">
          {sub}
        </span>
        <h2 className="font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-bright">
          {label}
        </h2>
      </div>
      {right}
    </div>
  )
}
