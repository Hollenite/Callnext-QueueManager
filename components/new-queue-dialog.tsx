"use client";

import { useEffect, useRef } from "react";
import { createQueueAction } from "@/app/dashboard/actions";
import { BusySubmit } from "@/components/busy-submit";

export function NewQueueDialog({ error }: { error?: string }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (error) dialog.current?.showModal();
  }, [error]);

  return (
    <>
      <button
        className="btn btn-primary"
        type="button"
        onClick={() => dialog.current?.showModal()}
      >
        + New queue
      </button>
      <dialog ref={dialog} className="queue-dialog">
        <form method="dialog" className="mb-4 flex items-center justify-between">
          <h2 className="text-xl">New queue</h2>
          <button className="btn btn-quiet" type="submit">
            Close
          </button>
        </form>
        <form action={createQueueAction} className="flex flex-col gap-3">
          <label className="flex flex-col gap-2">
            <span>Name</span>
            <input
              className="field"
              name="name"
              required
              maxLength={80}
              placeholder="Front desk"
              autoComplete="off"
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? "create-error" : undefined}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span>Average service time, minutes</span>
            <input
              className="field"
              type="number"
              name="default_service_minutes"
              min={1}
              max={120}
              defaultValue={10}
            />
          </label>
          {error ? (
            <p id="create-error" className="text-ticket" role="alert">
              {error}
            </p>
          ) : null}
          <BusySubmit
            className="btn btn-primary mt-2 w-fit"
            idle="Create queue"
            busy="Creating…"
          />
        </form>
      </dialog>
    </>
  );
}
