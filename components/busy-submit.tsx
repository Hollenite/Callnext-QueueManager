"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type Props = {
  idle: string;
  busy: string;
  className: string;
  children?: ReactNode;
};

export function BusySubmit({ idle, busy, className, children }: Props) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      type="submit"
      disabled={pending}
      aria-busy={pending}
    >
      {children}
      {pending ? busy : idle}
    </button>
  );
}
