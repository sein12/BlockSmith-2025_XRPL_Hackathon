export default function QuickTile({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full h-[72px] rounded-md border border-gray-300 shadow-md flex flex-col items-center justify-center gap-1"
    >
      <div className="w-7 h-7 flex items-center justify-center">{icon}</div>
      <div className="text-xs">{label}</div>
    </button>
  );
}
