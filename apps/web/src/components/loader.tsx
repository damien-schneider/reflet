import { Spinner } from "@phosphor-icons/react";

export default function Loader() {
  return (
    <div className="flex h-full items-center justify-center pt-8">
      <Spinner className="animate-spin" />
    </div>
  );
}
