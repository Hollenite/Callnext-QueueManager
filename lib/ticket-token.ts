export type StoredTicket = {
  token: string;
  entryId?: string;
};

function storageKey(queueId: string) {
  return `qm:${queueId}`;
}

export function newClientToken() {
  return crypto.randomUUID();
}

export function getTicket(queueId: string): StoredTicket | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(storageKey(queueId));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredTicket;
    if (!parsed?.token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveTicket(queueId: string, ticket: StoredTicket) {
  localStorage.setItem(storageKey(queueId), JSON.stringify(ticket));
}

export function clearTicket(queueId: string) {
  localStorage.removeItem(storageKey(queueId));
}
