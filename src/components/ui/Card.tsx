import type { HTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[20px] border border-border bg-surface shadow-[0_2px_6px_oklch(50%_0.05_50_/_0.06)]",
        className,
      )}
      {...props}
    />
  );
}
