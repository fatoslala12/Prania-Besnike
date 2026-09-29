export function DeveloperCredit({ className = "" }: { className?: string }) {
  return (
    <a
      href="https://lalvexa.al/"
      target="_blank"
      rel="noopener noreferrer"
      className={`group inline-block text-xs leading-relaxed text-muted transition-colors hover:text-ink ${className}`}
    >
      Zhvilluar dhe mirëmbajtur nga{" "}
      <span className="font-bold text-ink underline decoration-amber-400 decoration-2 underline-offset-4 transition-colors group-hover:decoration-brand">
        LalVexa SHPK
      </span>
      . Të gjitha të drejtat e rezervuara.
    </a>
  );
}
