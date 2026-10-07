import { BRAND } from "@/lib/brand";

// One installable web app per audience. Each gets its own name, start page and
// scope so the Resident, Security and Owner apps install as separate icons.
// Estate apps need the estate slug because their pages live under /<slug>/.

const SLUG = /^[a-z0-9][a-z0-9-]{0,80}$/;

const ICONS = [
  { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
];

function build(app: string, slug: string | null) {
  const base = { display: "standalone", background_color: "#ffffff", theme_color: "#1a1a1a", icons: ICONS, lang: "en" };

  if (app === "owner") {
    return {
      ...base,
      id: "/owner",
      name: `${BRAND.name} Owner`,
      short_name: "Owner",
      description: "Your properties, approvals and statements.",
      start_url: "/owner",
      scope: "/owner",
    };
  }
  if (!slug) return null;
  if (app === "resident") {
    return {
      ...base,
      id: `/${slug}/dashboard`,
      name: `${BRAND.name} Resident`,
      short_name: BRAND.name,
      description: "Visitors, payments, maintenance and community updates.",
      start_url: `/${slug}/dashboard`,
      scope: `/${slug}/`,
    };
  }
  if (app === "security") {
    return {
      ...base,
      id: `/${slug}/gate`,
      name: `${BRAND.name} Security`,
      short_name: "Gate",
      description: "Gate verification, parcels and incidents.",
      start_url: `/${slug}/gate`,
      scope: `/${slug}/gate`,
    };
  }
  return null;
}

export async function GET(request: Request, { params }: { params: Promise<{ app: string }> }) {
  const { app } = await params;
  const slug = new URL(request.url).searchParams.get("estate");
  const manifest = build(app, slug && SLUG.test(slug) ? slug : null);
  if (!manifest) return new Response("Not found", { status: 404 });

  return new Response(JSON.stringify(manifest), {
    headers: { "Content-Type": "application/manifest+json", "Cache-Control": "public, max-age=3600" },
  });
}
