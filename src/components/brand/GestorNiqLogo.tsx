import { useId } from "react";
import { cn } from "@/lib/utils";

export type GestorNiqLogoVariant = "icon" | "full";
export type GestorNiqLogoTheme = "auto" | "dark" | "light";
export type GestorNiqLogoSize = number | "sm" | "md" | "lg" | "xl";

interface GestorNiqLogoProps {
  variant?: GestorNiqLogoVariant;
  size?: GestorNiqLogoSize;
  className?: string;
  theme?: GestorNiqLogoTheme;
  title?: string;
}

interface LogoPalette {
  iconBackground: string;
  tile: string;
  arrow: string;
  textPrimary: string;
  textAccent: string;
}

const SIZE_MAP: Record<Exclude<GestorNiqLogoSize, number>, number> = {
  sm: 24,
  md: 32,
  lg: 48,
  xl: 64,
};

const FULL_VIEWBOX = { width: 236, height: 64 };
const FULL_WIDTH_RATIO = FULL_VIEWBOX.width / FULL_VIEWBOX.height;

const PALETTES: Record<Exclude<GestorNiqLogoTheme, "auto">, LogoPalette> = {
  dark: {
    iconBackground: "#0B1220",
    tile: "#1D4ED8",
    arrow: "#F9FAFB",
    textPrimary: "#F9FAFB",
    textAccent: "#2563EB",
  },
  light: {
    iconBackground: "#111827",
    tile: "#2563EB",
    arrow: "#F9FAFB",
    textPrimary: "#111827",
    textAccent: "#1D4ED8",
  },
};

function resolveSize(size: GestorNiqLogoSize): number {
  if (typeof size === "number") return size;
  return SIZE_MAP[size];
}

function resolveTheme(theme: GestorNiqLogoTheme): Exclude<GestorNiqLogoTheme, "auto"> {
  if (theme !== "auto") return theme;
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function IconShapes({ palette }: { palette: LogoPalette }) {
  return (
    <>
      <rect x="2" y="2" width="60" height="60" rx="14" fill={palette.iconBackground} />

      <rect x="7" y="7" width="14" height="14" rx="3" fill={palette.tile} />
      <rect x="25" y="7" width="14" height="14" rx="3" fill={palette.tile} />
      <rect x="43" y="7" width="14" height="14" rx="3" fill={palette.tile} />

      <rect x="7" y="25" width="14" height="14" rx="3" fill={palette.tile} />
      <rect x="25" y="25" width="14" height="14" rx="3" fill={palette.tile} />
      <rect x="43" y="25" width="14" height="14" rx="3" fill={palette.tile} />

      <rect x="7" y="43" width="14" height="14" rx="3" fill={palette.tile} />
      <rect x="25" y="43" width="14" height="14" rx="3" fill={palette.tile} />
      <rect x="43" y="43" width="14" height="14" rx="3" fill={palette.tile} />

      <path d="M11.9 47.9L51.8 16.5L53.2 17.9L56 8L46.1 10.8L47.5 12.2L16.1 52.1Z" fill={palette.arrow} />
    </>
  );
}

export function GestorNiqLogo({
  variant = "full",
  size = "md",
  className,
  theme = "auto",
  title,
}: GestorNiqLogoProps) {
  const titleId = useId();
  const resolvedSize = resolveSize(size);
  const resolvedTheme = resolveTheme(theme);
  const palette = PALETTES[resolvedTheme];
  const isIcon = variant === "icon";

  const width = isIcon ? resolvedSize : Math.round(resolvedSize * FULL_WIDTH_RATIO);
  const height = resolvedSize;

  return (
    <svg
      width={width}
      height={height}
      viewBox={isIcon ? "0 0 64 64" : "0 0 236 64"}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden={!title}
      aria-labelledby={title ? titleId : undefined}
      className={cn("shrink-0", className)}
      shapeRendering="geometricPrecision"
    >
      {title && <title id={titleId}>{title}</title>}
      <IconShapes palette={palette} />

      {!isIcon && (
        <>
          <text
            x="80"
            y="39"
            fill={palette.textPrimary}
            fontSize="28"
            fontWeight="600"
            letterSpacing="-0.03em"
            fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          >
            Gestor
          </text>
          <text
            x="171"
            y="39"
            fill={palette.textAccent}
            fontSize="28"
            fontWeight="600"
            letterSpacing="-0.03em"
            fontFamily="Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
          >
            Niq
          </text>
        </>
      )}
    </svg>
  );
}
