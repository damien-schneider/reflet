import { Button } from "@ctrl-ui/react/ui/button";
import { DialogFooter } from "@ctrl-ui/react/ui/dialog";
import { Spinner } from "@ctrl-ui/react/ui/spinner";

export function TagFormActions({
  layout,
  state,
  onCancel,
}: {
  layout: "popover" | "dialog";
  state: { isEditing: boolean; isSubmitting: boolean };
  onCancel: () => void;
}) {
  const isDialog = layout === "dialog";
  const size = isDialog ? "md" : "xs";
  const actions = (
    <>
      <Button
        disabled={state.isSubmitting}
        onClick={onCancel}
        size={size}
        variant={isDialog ? "surface" : "ghost"}
      >
        Cancel
      </Button>
      <Button
        disabled={state.isSubmitting}
        size={size}
        tone="primary"
        type="submit"
        variant="solid"
      >
        {state.isSubmitting && <Spinner data-icon="inline-start" size="xs" />}
        {state.isEditing ? "Save" : "Create"}
      </Button>
    </>
  );
  if (isDialog) {
    return <DialogFooter>{actions}</DialogFooter>;
  }
  return <div className="flex justify-end gap-2 pt-1">{actions}</div>;
}
