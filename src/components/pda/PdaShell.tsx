import { type ReactNode } from "react";

export function PdaShell({ children }: { children: ReactNode }) {
  return (
    <div className="pda-scanlines pda-flicker min-h-screen w-full">
      <div className="pda-scan-line" aria-hidden />
      {children}
    </div>
  );
}

export function PdaPanel({
  children,
  className = "",
  title,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <div className={`pda-panel pda-corners relative p-4 ${className}`}>
      {title && (
        <div className="text-[10px] uppercase font-bold text-muted-foreground mb-3 tracking-widest border-b border-border/30 pb-1">
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

export function PdaHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-2 mb-4">
      <h2 className="text-lg font-display uppercase tracking-[0.2em] pda-glow">▌ {title}</h2>
      {right}
    </div>
  );
}
