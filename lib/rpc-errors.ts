const COPY: Record<string, string> = {
  queue_closed: "This queue is closed.",
  already_in_queue: "You are already in this queue.",
  not_authorized: "You cannot do that.",
  not_found: "That queue was not found.",
  not_waiting: "You can only leave while you are waiting.",
  not_serving: "That person is not being served.",
  invalid_name: "Enter a name so the desk can call you.",
  invalid_outcome: "Choose done or no-show.",
  token_mismatch: "This ticket is not yours.",
};

export function rpcErrorMessage(error: { message?: string } | null) {
  if (!error?.message) return "Something went wrong. Try again.";
  const key = error.message.split("\n")[0]?.trim();
  return COPY[key] ?? "Something went wrong. Try again.";
}
