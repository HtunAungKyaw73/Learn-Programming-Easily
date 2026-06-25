export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-border" />
      <div className="h-4 w-72 rounded bg-border" />
      <div className="mt-8 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-16 rounded-md border border-border bg-surface"
          />
        ))}
      </div>
    </div>
  );
}
