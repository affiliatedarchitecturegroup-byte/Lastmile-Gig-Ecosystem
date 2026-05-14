/**
 * Robots.txt Generator
 * @module web-storefronts/app/robots
 * @description Dynamic robots.txt for storefront SEO
 * @phase P200 - Storefront SEO Meta Tags
 */

const BASE_URL = 'https://lastmilegig.aagais.co.za';

/** Robots.txt configuration */
interface RobotsConfig {
  rules: Array<{
    userAgent: string | string[];
    allow?: string | string[];
    disallow?: string | string[];
  }>;
  sitemap: string;
  host: string;
}

/**
 * Next.js App Router robots() function
 * Generates robots.txt dynamically
 */
export default function robots(): RobotsConfig {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/store/', '/store'],
        disallow: [
          '/partner/',
          '/api/',
          '/admin/',
          '/_next/',
          '/private/',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/partner/', '/api/', '/admin/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
