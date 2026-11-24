"use client";

import { useState } from "react";
import Loader from "@/components/motion/Loader";
import Hero from "./Hero";
import { FAQ, FinalCTA, IdentityStrip, Included, Manifesto, Pricing, Process, Work } from "./Sections";
import Footer from "@/components/brand/Footer";

export default function Landing() {
  const [started, setStarted] = useState(false);
  return (
    <>
      <Loader onDone={() => setStarted(true)} />
      <main>
        <Hero started={started} />
        <IdentityStrip />
        <Manifesto />
        <Process />
        <Work />
        <Included />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
