import type { ReactNode } from "react";
import { Card } from "./ui";

export type KpiTone = "neutral" | "success" | "warning" | "danger" | "cyan";

const ACCENT: Record<KpiTone, { border: string; iconBg: string; iconText: string; value: string }> = {
  neutral: { border: "border-l-navy", iconBg: "bg-navy/10", iconText: "text-navy", value: "text-foreground" },
  success: { border: "border-l-success", iconBg: "bg-success/10", iconText: "text-success", value: "text-success" },
  warning: { border: "border-l-warning", iconBg: "bg-warning/10", iconText: "text-warning", value: "text-foreground" },
  danger: { border: "border-l-danger", iconBg: "bg-danger/10", iconText: "text-danger", value: "text-danger" },
  cyan: { border: "border-l-cyan", iconBg: "bg-cyan/10", iconText: "text-cyan", value: "text-foreground" },
};

/**
 * Dashboard/summary metric tile. Deliberately restrained per the brand
 * refresh's "not a rainbow dashboard" rule: the card body stays neutral
 * white, differentiation comes only from the left accent border, the small
 * icon chip, and (for success/danger) the value's own color.
 */
export function KpiCard({
  label,
  value,
  tone = "neutral",
  icon,
}: {
  label: string;
  value: ReactNode;
  tone?: KpiTone;
  icon?: ReactNode;
}) {
  const accent = ACCENT[tone];
  return (
    <Card className={`border-l-4 ${accent.border}`}>
      <div className="flex items-center justify-between">
        <p className={`text-lg font-semibold ${accent.value}`}>{value}</p>
        {icon && <span className={`flex h-8 w-8 items-center justify-center rounded-full ${accent.iconBg} ${accent.iconText}`}>{icon}</span>}
      </div>
      <p className="mt-1 text-sm text-foreground-muted">{label}</p>
    </Card>
  );
}
