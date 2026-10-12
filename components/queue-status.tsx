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
        "queue-status display inline-flex min-h-8 flex-col items-start justify-center px-2.5 py-1 leading-[1.1] tracking-tight",
        variant === "full" && "is-full min-h-11 px-3 py-1.5",
        open ? "is-taking bg-open text-porcelain" : "is-shut bg-ticket text-white",
      )}
    >
      <span>{open ? "Open" : "Closed"}</span>
      {variant === "full" ? (
        <span className="queue-status-detail mt-0.5 font-sans text-[0.8rem] font-normal tracking-normal">
          {open ? "Taking names" : "Not taking names"}
        </span>
      ) : null}
    </p>
  );
}
