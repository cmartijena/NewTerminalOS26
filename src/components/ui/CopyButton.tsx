import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/utils/cn";

interface CopyButtonProps {
  text: string;
  title?: string;
  className?: string;
}

// Generic one-click "copy to clipboard" button with a brief checkmark confirmation —
// used wherever a row shows credentials (usuario/password) someone needs to paste
// elsewhere, instead of manually selecting the masked/mono text.
export function CopyButton({ text, title = "Copiar", className }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Copy to clipboard error:", err);
    }
  }

  return (
    <button
      type="button"
      title={title}
      onClick={handleClick}
      className={cn(
        "flex h-6 w-6 flex-none items-center justify-center rounded-full text-t3 hover:bg-bg hover:text-t1",
        className,
      )}
    >
      {copied ? <Check size={13} className="text-positive" /> : <Copy size={13} />}
    </button>
  );
}
