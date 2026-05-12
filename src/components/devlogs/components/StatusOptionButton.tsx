export function StatusOptionButton({
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
      className={`h-10 rounded-xl text-xs font-bold ${
        active
          ? "bg-blue-600 text-white"
          : "bg-white text-slate-500 hover:text-slate-900"
      }`}
    >
      {label}
    </button>
  );
}
