import { toast } from "sonner";

import { isDevEnv, serializeError } from "./dev-error";

function extractMessage(error: unknown): string | undefined {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return;
}

export function toastError(error: unknown, friendly: string): void {
  if (!isDevEnv()) {
    toast.error(friendly);
    return;
  }

  const description = extractMessage(error);
  const payload = serializeError(error);

  toast.error(friendly, {
    description,
    action: {
      label: "Copy",
      onClick: () => {
        navigator.clipboard.writeText(payload).catch(() => {
          // ignore — best-effort copy
        });
      },
    },
  });
}
