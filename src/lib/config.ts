/** Public, non-secret configuration. Safe to ship to the browser. */
export const siteConfig = {
  brand: "IDENTITY.",
  price: Number(process.env.NEXT_PUBLIC_PRICE_INR ?? 50),
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, ""),
  upiId: process.env.NEXT_PUBLIC_UPI_ID ?? "fulbandheishan@okicici",
  upiName: process.env.NEXT_PUBLIC_UPI_NAME ?? "Ishan Fulbandhe",
  qrImage: "/payment-qr.png",
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "https://instagram.com",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
};

export function portfolioUrl(slug: string) {
  return `${siteConfig.siteUrl}/p/${slug}`;
}

/** upi:// deep link that opens the customer's UPI app with the amount pre-filled. */
export function upiLink(note?: string) {
  const p = new URLSearchParams({
    pa: siteConfig.upiId,
    pn: siteConfig.upiName,
    am: siteConfig.price.toFixed(2),
    cu: "INR",
  });
  if (note) p.set("tn", note);
  return `upi://pay?${p.toString().replace(/\+/g, "%20")}`;
}
