import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;

interface DialogContentProps {
  children: ReactNode;
  title: string;
  // Overrides the default max-w-md — pass a wider Tailwind max-w-* class for forms with
  // more fields (e.g. AgenciaFormDialog) instead of widening every dialog in the app.
  className?: string;
}

export function DialogContent({ children, title, className }: DialogContentProps) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="fixed inset-0 z-40 bg-t1/30" />
      <RadixDialog.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-full max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[20px] border border-border bg-surface p-6 shadow-xl",
          className,
        )}
      >
        <div className="sticky -top-6 -mt-6 mb-4 flex items-center justify-between bg-surface pt-6">
          <RadixDialog.Title className="text-[15px] font-bold text-t1">{title}</RadixDialog.Title>
          <RadixDialog.Close className="text-t3 hover:text-t1">
            <X size={16} />
          </RadixDialog.Close>
        </div>
        {children}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
