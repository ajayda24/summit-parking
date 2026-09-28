import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Summit Parking",
    short_name: "Summit",
    description: "Find parking that fits your car, or earn from your unused space.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F7F4",
    theme_color: "#F7F7F4",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
