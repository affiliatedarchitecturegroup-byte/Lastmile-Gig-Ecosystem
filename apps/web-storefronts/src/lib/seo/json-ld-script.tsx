/**
 * JSON-LD Script Component
 * @module web-storefronts/lib/seo/json-ld-script
 * @description Server-safe component for injecting JSON-LD structured data
 * @phase P200 - Storefront SEO Meta Tags
 */

import React from 'react';

/** Props for JsonLdScript */
interface JsonLdScriptProps {
  readonly data: Record<string, unknown>;
}

/**
 * JsonLdScript - Injects JSON-LD structured data into the page head
 * Used for schema.org markup (Restaurant, Menu, BreadcrumbList)
 *
 * Usage:
 *   <JsonLdScript data={generateRestaurantJsonLd(restaurant)} />
 */
export function JsonLdScript({ data }: JsonLdScriptProps): React.ReactElement {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data),
      }}
    />
  );
}
