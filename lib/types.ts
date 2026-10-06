export type EntryStatus = "waiting" | "serving" | "done" | "no_show" | "left";

export type Queue = {
  id: string;
  owner_id: string;
  name: string;
  is_open: boolean;
  default_service_minutes: number;
  created_at: string;
};

export type QueueEntry = {
  id: string;
  queue_id: string;
  display_name: string;
  status: EntryStatus;
  joined_at: string;
  serving_at?: string | null;
  finished_at?: string | null;
};

export type PublicEntry = Pick<
  QueueEntry,
  "id" | "queue_id" | "display_name" | "status" | "joined_at"
>;

export type WaitEstimate = {
  people_ahead: number;
  avg_minutes: number;
  sample_count: number;
};

export const PUBLIC_ENTRY_COLUMNS =
  "id, queue_id, display_name, status, joined_at" as const;
