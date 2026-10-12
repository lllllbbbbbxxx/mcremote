import type { Metadata } from "next";
import { DesignLab } from "@/components/design-lab/design-lab";

export const metadata: Metadata = {
  title: "McRemote Design Lab",
  description: "McRemote 可交互 UI 设计实验页。",
};

export default function DesignLabPage() {
  return <DesignLab />;
}
