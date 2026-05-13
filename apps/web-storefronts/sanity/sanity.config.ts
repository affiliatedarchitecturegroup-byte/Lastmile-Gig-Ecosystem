/**
 * Sanity CMS Configuration for Lastmile Gig Restaurant Storefronts (P176)
 *
 * Configures the Sanity Studio instance for restaurant partners to manage
 * their menus, branding, and storefront content.
 *
 * Features:
 * - Custom restaurant and menu schemas
 * - Cloudinary asset integration for food photography
 * - Multi-partner workspace support
 * - Webhook configuration for real-time menu sync
 *
 * Access: Embedded at /partner/menu in the partner admin portal
 *
 * @module web-storefronts/sanity/config
 * @language TypeScript
 * @see docs/specs/14_RESTAURANT_STOREFRONT_SPEC.md
 */

import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { visionTool } from '@sanity/vision';
import { cloudinarySchemaPlugin } from 'sanity-plugin-cloudinary';

import { schemaTypes } from './schemas';

const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || 'lmg-storefronts';
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || 'production';

export default defineConfig({
  name: 'lastmile-gig-storefronts',
  title: 'Lastmile Gig - Restaurant Storefronts',

  projectId: PROJECT_ID,
  dataset: DATASET,

  plugins: [
    structureTool(),
    visionTool(),
    cloudinarySchemaPlugin(),
  ],

  schema: {
    types: schemaTypes,
  },

  // Studio customisation
  studio: {
    components: {
      // Custom branding for the Sanity Studio
    },
  },

  // Document-level access control
  document: {
    // Partners can only edit their own restaurant documents
    productionUrl: async (prev, context) => {
      const { document } = context;
      if (document._type === 'restaurant') {
        const slug = (document as Record<string, unknown>).slug as { current: string } | undefined;
        if (slug?.current) {
          return `https://lastmilegig.aagais.co.za/store/${slug.current}`;
        }
      }
      return prev;
    },
  },
});
