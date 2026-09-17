import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/utils/cn";

interface KpiCardProps {
  badgeBg: string;
  badgeColor: string;
  icon: React.ReactNode;
  label: string;
  isLoading: boolean;
  isError: boolean;
  value: React.ReactNode;
  sub: React.ReactNode;
  valueColor?: string;
  extra?: React.ReactNode;
  className?: string;
}

export function KpiCard({
  badgeBg,
  badgeColor,
  icon,
  label,
  isLoading,
  isError,
  value,
  sub,
  valueColor,
  extra,
  className,
}: KpiCardProps) {
  return (
    <div className={cn("flex items-center gap-[14px] rounded-[20px] border border-border bg-surface p-[18px_19px]", className)}>
      <div
        className={`flex h-[38px] w-[38px] flex-none items-center justify-center rounded-xl ${badgeBg} ${badgeColor} [&_svg]:h-[19px] [&_svg]:w-[19px]`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-bold text-t2">{label}</div>
        {isError ? (
          <div className="text-sm text-negative">Error</div>
        ) : isLoading ? (
          <Skeleton className="mt-1 h-6 w-16" />
        ) : (
          <div className={cn("whitespace-nowrap font-mono text-[21px] font-bold text-t1", valueColor)}>{value}</div>
        )}
        <div className="mt-px text-[11px] text-t3">{sub}</div>
        {!isLoading && !isError && extra}
      </div>
    </div>
  );
}
