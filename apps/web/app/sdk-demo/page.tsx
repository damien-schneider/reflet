import type { Metadata } from "next";
import { SdkDemo } from "@/features/sdk-demo/sdk-demo";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "SDK preview",
};

export default function SdkDemoPage() {
  return <SdkDemo />;
}
