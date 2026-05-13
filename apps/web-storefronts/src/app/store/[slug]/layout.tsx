/**
 * Storefront Layout (P186)
 *
 * Layout wrapper for all /store/[slug]/* pages.
 * Provides the storefront shell with header and footer.
 *
 * @module web-storefronts/app/store/[slug]/layout
 */

import React from 'react';

import { StorefrontHeader } from '@/components/storefront/storefront-header';
import { StorefrontFooter } from '@/components/storefront/storefront-footer';

interface StorefrontLayoutProps {
  children: React.ReactNode;
  params: { slug: string };
}

export default function StorefrontLayout({
  children,
  params,
}: StorefrontLayoutProps): React.JSX.Element {
  return (
    <div className="flex flex-col min-h-screen">
      <StorefrontHeader slug={params.slug} />
      <div className="flex-1">{children}</div>
      <StorefrontFooter />
    </div>
  );
}
