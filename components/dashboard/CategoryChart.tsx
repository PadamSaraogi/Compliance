export function CategoryChart({ categories }: { categories: { name: string, total: number, completed: number, color: string }[] }) {
  if (categories.length === 0) {
    return <div className="text-center py-8 text-[var(--color-muted)]">No category data available</div>;
  }

  return (
    <div className="space-y-4">
      {categories.map((cat, i) => {
        const percentage = cat.total > 0 ? (cat.completed / cat.total) * 100 : 0;
        return (
          <div key={i} className="flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-[var(--color-text)]">{cat.name}</span>
              <span className="text-[var(--color-muted)]">{cat.completed} / {cat.total} completed</span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${percentage}%`, backgroundColor: cat.color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
