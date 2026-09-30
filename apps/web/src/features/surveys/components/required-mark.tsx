export function RequiredMark() {
  return (
    <>
      <span aria-hidden className="ml-1 text-destructive">
        *
      </span>
      <span className="sr-only">(required)</span>
    </>
  );
}
