export function AvatarStack({ count, label }: { count: number; label: string }) {
  const initial = label.trim().charAt(0).toUpperCase() || '?'
  return (
    <div className="flex -space-x-1.5" aria-hidden="true">
      {Array.from({ length: Math.min(count, 3) }).map((_, index) => (
        <span key={index} className="flex h-5 w-5 items-center justify-center rounded-full border border-line bg-accent-soft text-[9px] font-bold text-accent">
          {initial}
        </span>
      ))}
    </div>
  )
}
