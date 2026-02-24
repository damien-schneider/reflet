import Image from "next/image";

import { H2, Lead } from "@/components/ui/typography";

const REVIEWS = [
  {
    id: "sarah-j",
    text: '"Reflet transformed how we handle feature requests. Instead of a chaotic Slack channel, we now have a clear, prioritized list of what our users actually want."',
    author: "Sarah J.",
    role: "Product Manager",
    company: "The Cloud",
  },
  {
    id: "mike-t",
    text: '"The roadmap view is a game changer for our stakeholders. They can finally see what\'s being worked on without pestering the engineering team every day."',
    author: "Mike T.",
    role: "CTO",
    company: "Echo",
  },
  {
    id: "elena-r",
    text: '"I love the changelog feature. Closing the loop with users when we ship a feature they asked for has significantly reduced our churn."',
    author: "Elena R.",
    role: "Founder",
    company: "One Rec",
  },
] as const;

const PRODUCT_LOGOS = [
  { name: "Reflet", src: "/logos/reflet.png", width: 32, height: 32 },
  { name: "The Cloud", src: "/logos/the-cloud.png", width: 120, height: 32 },
  { name: "Echo", src: "/logos/echo.svg", width: 90, height: 24 },
  { name: "One Rec", src: "/logos/one-rec.png", width: 32, height: 32 },
  { name: "The Mug", src: "/logos/the-mug.png", width: 32, height: 32 },
] as const;

export default function Testimonials() {
  return (
    <section className="bg-muted py-24">
      <div className="mx-auto max-w-7xl px-4 text-left sm:px-6 lg:px-8">
        <H2 className="mb-6" variant="section">
          Loved by product teams
        </H2>
        <Lead className="mb-12">
          Teams use Reflet to listen to their users and ship the right features.
        </Lead>

        {/* Product logo bar */}
        <div className="mb-16 flex flex-wrap items-center gap-8 sm:gap-12">
          {PRODUCT_LOGOS.map((product) => (
            <div
              className="flex h-8 items-center opacity-60 grayscale transition-all hover:opacity-100 hover:grayscale-0"
              key={product.name}
            >
              <Image
                alt={product.name}
                height={product.height}
                src={product.src}
                width={product.width}
              />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {REVIEWS.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      </div>
    </section>
  );
}

interface ReviewCardProps {
  review: (typeof REVIEWS)[number];
}

function ReviewCard({ review }: ReviewCardProps) {
  return (
    <div className="flex min-h-[200px] flex-col justify-between rounded-xl border border-border bg-card p-8 shadow-sm">
      <p className="mb-6 font-medium font-serif text-foreground text-lg italic leading-relaxed">
        {review.text}
      </p>
      <div>
        <p className="font-semibold text-foreground">{review.author}</p>
        <p className="text-muted-foreground text-xs uppercase tracking-wide">
          {review.role} at {review.company}
        </p>
      </div>
    </div>
  );
}
