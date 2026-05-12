export function DevlogFilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-bold ${
        active
          ? "bg-blue-600 text-white"
          : "bg-slate-100 text-slate-500 hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );
}
