"use client";

import dynamic from "next/dynamic";

const NavbarDesktop = dynamic(() => import("../navbar-desktop"), {
  loading: () => (
    <nav className="sticky top-0 z-50 hidden h-20 border-border border-b bg-background/80 backdrop-blur-md md:block" />
  ),
  ssr: false,
});

const NavbarMobile = dynamic(() => import("../navbar-mobile"), {
  loading: () => (
    <div className="sticky top-0 z-50 h-16 border-border border-b bg-background/95 md:hidden" />
  ),
  ssr: false,
});

export default function LandingNavbar() {
  return (
    <>
      <NavbarDesktop />
      <NavbarMobile />
    </>
  );
}
