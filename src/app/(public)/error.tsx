"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/site/ErrorState";

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorState title="Something went wrong." reset={reset} />;
}
