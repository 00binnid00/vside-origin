import type React from "react";

export function DevlogStatCard({
  title,
  value,
  icon,
  subText,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  subText?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className="text-slate-500">{icon}</div>
      </div>
      <p className="mt-3 text-2xl font-bold">{value}</p>
      {subText && <p className="mt-1 text-xs text-slate-500">{subText}</p>}
    </div>
  );
}
