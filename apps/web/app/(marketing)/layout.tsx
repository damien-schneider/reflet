import { Inter } from "next/font/google";

const inter = Inter({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-marketing",
});

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={inter.variable}>{children}</div>;
}
