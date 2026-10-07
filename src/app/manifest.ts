import type { MetadataRoute } from "next";
import { BRAND } from "@/lib/brand";

/**
 * Site-wide manifest for anyone not inside a specific app. The Resident,
 * Security and Owner apps each have their own manifest (see
 * src/app/manifests/[app]/route.ts) with their own start page and scope.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${BRAND.name}`,
    short_name: BRAND.name,
    description: BRAND.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1a1a1a",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
