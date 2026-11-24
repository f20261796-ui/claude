import Link from "next/link";
import { Wordmark } from "./Logo";
import { siteConfig } from "@/lib/config";
import { TLink } from "@/components/motion/PageTransition";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative overflow-hidden border-t border-line bg-ink px-5 pb-6 pt-16 md:px-10 md:pt-24">
      <div className="grid gap-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="editorial text-3xl leading-tight text-bone md:text-4xl">
            A studio for digital identities — built for people who are just getting started.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 md:col-span-6 md:col-start-7">
          <div>
            <p className="label mb-4 text-ash">Navigate</p>
            <ul className="space-y-2 text-bone/80">
              <li><Link className="hover:text-blood" href="/#process">Process</Link></li>
              <li><Link className="hover:text-blood" href="/#work">Examples</Link></li>
              <li><Link className="hover:text-blood" href="/#pricing">Pricing</Link></li>
              <li><TLink className="hover:text-blood" href="/create">Create yours</TLink></li>
            </ul>
          </div>
          <div>
            <p className="label mb-4 text-ash">Follow</p>
            <ul className="space-y-2 text-bone/80">
              <li><a className="hover:text-blood" href={siteConfig.instagram} target="_blank" rel="noreferrer">Instagram ↗</a></li>
              {siteConfig.contactEmail && (
                <li><a className="hover:text-blood" href={`mailto:${siteConfig.contactEmail}`}>Email ↗</a></li>
              )}
            </ul>
          </div>
        </div>
      </div>
      <div aria-hidden className="mt-16 select-none overflow-hidden md:mt-24">
        <Wordmark className="block text-[24vw] leading-[0.78] text-bone/[0.07]" />
      </div>
      <div className="mt-6 flex flex-col justify-between gap-2 border-t border-line pt-5 md:flex-row">
        <span className="label text-ash">© {year} IDENTITY. All rights reserved.</span>
        <span className="label text-ash">Personal portfolio websites — ₹{siteConfig.price}</span>
      </div>
    </footer>
  );
}
