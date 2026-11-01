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

export function OrganizationMark({ name }: { name: string }) {
  return (
    <span aria-hidden="true" className="dt-org-mark">
      {initials(name).charAt(0)}
    </span>
  );
}

function AccountHeader({
  name,
  person,
}: {
  name: string;
  person: AccountPerson | null;
}) {
  const email = person?.email && person.email !== name ? person.email : null;
  return (
    <>
      <span className="dt-account-name">{name}</span>
      {email && <span className="dt-meta">{email}</span>}
    </>
  );
}

export function AccountFooter({
  actions,
  badge,
  groupLabel,
  note,
  organizationName,
  person,
}: {
  actions: MenuItem[];
  badge?: string;
  groupLabel?: string;
  note?: string;
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
      {badge && <span className="dt-chip">{badge}</span>}
      <ChevronUpDownIcon />
    </>
  );
  return (
    <div className="dt-sheet-account">
      <Menu
        groupLabel={groupLabel}
        header={
          <AccountHeader name={name ?? organizationName} person={person} />
        }
        items={actions}
        note={note}
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
