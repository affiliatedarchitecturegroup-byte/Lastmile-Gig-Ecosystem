/**
 * Sanity CMS Configuration for Restaurant Storefronts.
 *
 * Manages restaurant profiles, menu categories, menu items,
 * and partner content. Cloudinary integration for media assets.
 *
 * @see docs/specs/14_RESTAURANT_STOREFRONT_SPEC.md
 * @module web-storefronts
 */

import { defineConfig } from 'sanity';
import { deskTool } from 'sanity/desk';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemas';

export default defineConfig({
  name: 'lastmile-gig-storefronts',
  title: 'Lastmile Gig - Restaurant Storefronts',

  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? 'placeholder',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',

  plugins: [deskTool(), visionTool()],

  schema: {
    types: schemaTypes,
  },

  document: {
    newDocumentOptions: (prev) =>
      prev.filter(
        (item) => !['siteSettings'].includes(item.templateId),
      ),
  },
});
