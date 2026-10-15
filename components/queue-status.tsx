import { cn } from "@/lib/cn";

type Props = {
  open: boolean;
  variant?: "compact" | "full";
};

export function QueueStatus({ open, variant = "compact" }: Props) {
  return (
    <p
      role="status"
      className={cn(
        "queue-status",
        variant === "full" && "is-full",
        open ? "is-taking" : "is-shut",
      )}
    >
      <span className="queue-status-dot" aria-hidden="true" />
      <span>{open ? "Open" : "Closed"}</span>
      {variant === "full" ? (
        <span className="queue-status-detail">
          {open ? "Taking names" : "Not taking names"}
        </span>
      ) : null}
    </p>
  );
}
