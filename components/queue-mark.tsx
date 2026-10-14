import { cn } from "@/lib/cn";

export function QueueMark({ className }: { className?: string }) {
  return (
    <span className={cn("queue-mark", className)} aria-hidden="true">
      Q
    </span>
  );
}
