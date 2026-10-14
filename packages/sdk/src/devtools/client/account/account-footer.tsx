import type { ReactNode } from "react";
import { ChevronUpDownIcon } from "../devtools-icons";
import { Menu, type MenuItem } from "../menu";

export interface AccountPerson {
  email: string | null;
  image?: string | null;
  name: string | null;
}

const WHITESPACE = /\s+/;

function initials(text: string): string {
  return text
    .split(WHITESPACE)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

function Avatar({ image, name }: { image: string | null; name: string }) {
  return (
    <span aria-hidden="true" className="dt-avatar">
      {initials(name)}
      {image && (
        <img
          alt=""
          height={28}
          referrerPolicy="no-referrer"
          src={image}
          width={28}
        />
      )}
    </span>
  );
}

export function AccountFooter({
  actions,
  organizationName,
  person,
}: {
  actions: MenuItem[];
  organizationName: string;
  person: AccountPerson | null;
}) {
  const name = person?.name ?? person?.email ?? null;
  const content = (
    <>
      <Avatar image={person?.image ?? null} name={name ?? organizationName} />
      <span className="dt-account-text">
        <span className="dt-account-name">{name ?? organizationName}</span>
        {name && <span className="dt-meta">{organizationName}</span>}
      </span>
      <ChevronUpDownIcon />
    </>
  );
  return (
    <div className="dt-sheet-account">
      <Menu
        items={actions}
        placement="above"
        trigger={{
          className: "dt-account",
          content,
          label: name ? `${name}, ${organizationName}` : organizationName,
        }}
      />
    </div>
  );
}

export function AccountNote({ children }: { children: ReactNode }) {
  return (
    <div className="dt-sheet-account">
      <p className="dt-meta">{children}</p>
    </div>
  );
}
