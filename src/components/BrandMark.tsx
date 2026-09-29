import Image from "next/image";
import Link from "next/link";

type Props = {
  href?: string | null;
  size?: "sm" | "md" | "lg";
  align?: "left" | "center";
  showTagline?: boolean;
  className?: string;
};

const SIZES = {
  sm: { img: "h-10 w-auto", title: "text-[1.05rem]", badge: "text-[0.55rem] px-1.5 py-[1px]", gap: "gap-2.5" },
  md: { img: "h-20 w-auto", title: "text-2xl", badge: "text-[0.65rem] px-2 py-0.5", gap: "gap-3" },
  lg: { img: "h-36 w-auto md:h-44", title: "text-4xl md:text-5xl", badge: "text-xs px-2.5 py-1", gap: "gap-4" },
};

export function BrandMark({
  href = "/",
  size = "sm",
  align = "left",
  showTagline = false,
  className = "",
}: Props) {
  const s = SIZES[size];
  const stacked = size !== "sm";

  const content = (
    <span
      className={`inline-flex ${stacked ? "flex-col" : "flex-row items-center"} ${s.gap} ${
        align === "center" ? "items-center text-center" : stacked ? "items-start text-left" : ""
      } ${className}`}
    >
      <Image
        src="/mshms-logo.png"
        alt="Ministria e Shëndetësisë dhe Mirëqenies Sociale"
        width={223}
        height={168}
        priority={size === "lg"}
        className={`${s.img} select-none`}
      />
      <span className={`flex flex-col ${align === "center" ? "items-center" : "items-start"} leading-none`}>
        <span className={`font-extrabold tracking-tight text-ink ${s.title}`}>
          Prania <span className="text-brand">Besnike</span>
        </span>
        <span className="mt-1 inline-flex items-center gap-1.5">
          <span className={`rounded bg-brand font-bold tracking-[0.18em] text-white ${s.badge}`}>
            MSHMS
          </span>
          {showTagline && (
            <span className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted">
              Asnjë qytetar pa përgjigje
            </span>
          )}
        </span>
      </span>
    </span>
  );

  if (!href) return content;
  return (
    <Link href={href} className="inline-block focus-visible:outline-none" aria-label="Prania Besnike · MSHMS">
      {content}
    </Link>
  );
}
