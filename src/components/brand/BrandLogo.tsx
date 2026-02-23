import { cn } from "@/lib/utils";
import { GestorNiqLogo, type GestorNiqLogoTheme } from "@/components/brand/GestorNiqLogo";

type BrandLogoSize = "sm" | "md" | "lg";

interface BrandLogoProps {
  size?: BrandLogoSize;
  showWordmark?: boolean;
  showTagline?: boolean;
  className?: string;
  theme?: GestorNiqLogoTheme;
}

const LOGO_SIZE_MAP: Record<BrandLogoSize, number> = {
  sm: 32,
  md: 40,
  lg: 48,
};

const TAGLINE_SIZE_MAP: Record<BrandLogoSize, string> = {
  sm: "text-xs",
  md: "text-xs",
  lg: "text-sm",
};

export function BrandLogo({
  size = "md",
  showWordmark = true,
  showTagline = false,
  className,
  theme = "dark",
}: BrandLogoProps) {
  const logoSize = LOGO_SIZE_MAP[size];
  const variant = showWordmark ? "full" : "icon";

  return (
    <div
      className={cn(
        "inline-flex min-w-0",
        showTagline && showWordmark ? "flex-col items-start gap-1.5" : "items-center",
        className,
      )}
    >
      <GestorNiqLogo variant={variant} size={logoSize} theme={theme} />
      {showTagline && showWordmark && (
        <p className={cn("truncate font-medium text-muted-foreground", TAGLINE_SIZE_MAP[size])}>
          Founder Metrics Studio
        </p>
      )}
    </div>
  );
}
