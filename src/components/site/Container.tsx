export function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-3xl px-6 ${className ?? ""}`}>
      {children}
    </div>
  );
}
