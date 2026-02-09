import { Spinner } from "@phosphor-icons/react";

export default function Loader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center pt-8">
      <Spinner className="animate-spin" />
    </div>
  );
}
