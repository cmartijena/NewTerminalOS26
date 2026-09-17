import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/cn";

const buttonVariants = cva(
  "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-full border px-[18px] text-[13.5px] font-bold transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:h-[15px] [&_svg]:w-[15px]",
  {
    variants: {
      variant: {
        secondary: "border-border bg-surface text-t2 hover:bg-accent-tint/40",
        primary: "border-accent bg-accent text-white hover:opacity-90",
        "outline-purple": "border-purple text-purple hover:bg-purple-tint",
        "outline-blue": "border-blue text-blue hover:bg-blue-tint",
      },
    },
    defaultVariants: { variant: "secondary" },
  },
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

// forwardRef is required here, not just style — Radix's Dialog `asChild` trigger clones
// this element and attaches a ref to it for focus management.
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, ...props },
  ref,
) {
  return <button ref={ref} className={cn(buttonVariants({ variant }), className)} {...props} />;
});
