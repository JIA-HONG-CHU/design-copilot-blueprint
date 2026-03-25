/**
 * AiButton — unified AI action button across the entire app.
 *
 * Visual identity:
 *   - Violet colour family (distinct from primary blue)
 *   - "AI" badge built-in (no separate Badge needed)
 *   - Loader2 spinner when loading
 *   - Three variants: filled (default), outline, ghost
 */

import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface AiButtonProps extends Omit<ButtonProps, "variant"> {
  /** Show spinner + disable interaction */
  loading?: boolean;
  /** Visual weight: filled (default), outline, ghost */
  aiVariant?: "filled" | "outline" | "ghost";
}

const variantClass = {
  filled: "btn-ai",
  outline: "btn-ai-outline",
  ghost: "btn-ai-ghost",
} as const;

const AiButton = forwardRef<HTMLButtonElement, AiButtonProps>(
  ({ loading = false, aiVariant = "filled", className, children, disabled, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        variant="ghost"
        disabled={disabled || loading}
        className={cn(variantClass[aiVariant], className)}
        {...props}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <span className="badge-ai mr-1.5">AI</span>}
        {children}
      </Button>
    );
  },
);
AiButton.displayName = "AiButton";

export { AiButton };
