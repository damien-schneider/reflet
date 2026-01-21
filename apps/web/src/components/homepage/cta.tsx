import { CaretRight } from "@phosphor-icons/react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function CTA() {
  return (
    <section className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-4 text-left sm:px-6 lg:px-8">
        <h2 className="mb-6 max-w-3xl font-bold text-4xl tracking-tight sm:text-5xl">
          Ready to build better products?
        </h2>
        <p className="mb-10 max-w-2xl text-lg text-muted-foreground">
          Join hundreds of teams using Reflet to listen to their users and ship
          the right features, faster.
        </p>

        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <Link href="/dashboard">
            <Button
              className="w-full rounded-full sm:w-auto"
              size="lg"
              variant="default"
            >
              Start free trial
            </Button>
          </Link>
          <a
            className="flex items-center justify-center font-medium text-foreground text-sm transition-opacity hover:opacity-70 sm:justify-start"
            href="https://github.com/damien-schneider/reflet"
            rel="noopener noreferrer"
            target="_blank"
          >
            Read the docs <CaretRight className="ml-1" size={16} />
          </a>
        </div>
      </div>
    </section>
  );
}
