import Link from "next/link";

export default function Header() {
  const links = [
    { href: "/", label: "Home" },
    { href: "/dashboard", label: "Dashboard" },
  ] as const;

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <nav className="flex gap-4 text-lg">
          {links.map(({ href, label }) => {
            return (
              <Link href={href} key={href}>
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2" />
      </div>
      <hr />
    </div>
  );
}
