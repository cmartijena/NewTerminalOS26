import type { InputHTMLAttributes, LabelHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-[42px] rounded-full border border-border bg-surface px-[18px] text-[13.5px] text-t1 placeholder:text-t3 focus:outline-none focus:ring-2 focus:ring-blue",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "h-[42px] rounded-full border border-border bg-surface px-[18px] text-[13.5px] font-semibold text-t2 focus:outline-none focus:ring-2 focus:ring-blue",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1 block text-xs font-medium text-t2", className)} {...props} />;
}
