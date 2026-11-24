"use client";

import { useState } from "react";
import dynamic from "next/dynamic";

const IntroPortal = dynamic(() => import("@/components/gl/IntroPortal"), { ssr: false });
import Hero from "./Hero";
import { FAQ, FinalCTA, IdentityStrip, Included, Manifesto, Process, Work } from "./Sections";
import Footer from "@/components/brand/Footer";

export default function Landing() {
  const [started, setStarted] = useState(false);
  return (
    <>
      <IntroPortal onOpen={() => setStarted(true)} onDone={() => setStarted(true)} />
      <main>
        <Hero started={started} />
        <IdentityStrip />
        <Manifesto />
        <Process />
        <Work />
        <Included />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
