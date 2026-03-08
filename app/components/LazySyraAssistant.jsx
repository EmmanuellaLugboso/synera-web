"use client";

import dynamic from "next/dynamic";

const SyraAssistant = dynamic(() => import("./SyraAssistant"), {
  ssr: false,
  loading: () => null,
});

export default function LazySyraAssistant() {
  return <SyraAssistant />;
}
