"use client";

import dynamic from "next/dynamic";

const NavbarDesktop = dynamic(() => import("../navbar-desktop"), {
  ssr: false,
  loading: () => (
    <nav className="sticky top-0 z-50 hidden h-20 border-border border-b bg-background/80 backdrop-blur-md md:block" />
  ),
});

const NavbarMobile = dynamic(() => import("../navbar-mobile"), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-x-4 bottom-4 z-50 h-12 rounded-2xl border border-border bg-background/95 shadow-lg backdrop-blur-md md:hidden" />
  ),
});

export default function LandingNavbar() {
  return (
    <>
      <NavbarDesktop />
      <NavbarMobile />
    </>
  );
}
