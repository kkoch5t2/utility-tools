import type { APIRoute } from "astro";
import { tools } from "../config/tools";
import { siteConfig } from "../config/site";

const staticPaths = ["/", "/privacy/"];

export const GET: APIRoute = () => {
  const urls = [
    ...staticPaths,
    ...tools.filter((tool) => tool.status === "available").map((tool) => tool.href),
  ];

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((path) => `  <url><loc>${new URL(path, siteConfig.url).toString()}</loc></url>`),
    "</urlset>",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
