export function Container({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`mx-auto w-full max-w-3xl ${className ?? ""}`}>
      {children}
    </div>
  );
}
