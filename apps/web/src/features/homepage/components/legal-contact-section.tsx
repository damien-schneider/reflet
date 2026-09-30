import type { ReactNode } from "react";

export function LegalContactSection({
  children,
  heading,
}: {
  children: ReactNode;
  heading: string;
}) {
  return (
    <section>
      <h2>{heading}</h2>
      <p>{children}</p>
      <p>
        <strong>Email:</strong>{" "}
        <a href="mailto:legal@reflet.app">legal@reflet.app</a>
      </p>
      <p>
        <strong>Entity:</strong> Damien Schneider EI, France
      </p>
    </section>
  );
}
