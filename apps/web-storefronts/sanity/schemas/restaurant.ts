/**
 * Sanity Schema: Restaurant Document (P177)
 *
 * The core restaurant document in Sanity CMS. Each restaurant partner
 * has exactly one restaurant document that contains their branding,
 * location, operating hours, and configuration.
 *
 * Used by:
 * - Partner admin portal (menu management)
 * - Next.js storefront SSR (public storefront pages)
 * - svc-storefronts NestJS service (API layer)
 *
 * @module web-storefronts/sanity/schemas/restaurant
 */

import { defineType, defineField } from 'sanity';

export const restaurant = defineType({
  name: 'restaurant',
  title: 'Restaurant',
  type: 'document',
  fields: [
    // -----------------------------------------------------------------------
    // Identity
    // -----------------------------------------------------------------------
    defineField({
      name: 'name',
      title: 'Restaurant Name',
      type: 'string',
      validation: (rule) => rule.required().max(120),
    }),
    defineField({
      name: 'slug',
      title: 'URL Slug',
      type: 'slug',
      description: 'Used in the URL: /store/{slug}',
      options: {
        source: 'name',
        maxLength: 80,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'partnerId',
      title: 'Partner ID',
      type: 'string',
      description: 'UUID linking to the partners table in Supabase',
      validation: (rule) => rule.required(),
      readOnly: true,
    }),

    // -----------------------------------------------------------------------
    // Branding
    // -----------------------------------------------------------------------
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'cloudinary.asset',
      description: 'Restaurant logo (square, min 200x200px)',
    }),
    defineField({
      name: 'coverImage',
      title: 'Cover Image',
      type: 'cloudinary.asset',
      description: 'Hero banner image (16:9 ratio, min 1200x675px)',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      description: 'Short description shown on the storefront',
      validation: (rule) => rule.max(500),
    }),
    defineField({
      name: 'cuisine',
      title: 'Cuisine Type',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Fast Food', value: 'fast-food' },
          { title: 'Pizza', value: 'pizza' },
          { title: 'Burgers', value: 'burgers' },
          { title: 'Sushi', value: 'sushi' },
          { title: 'Indian', value: 'indian' },
          { title: 'Chinese', value: 'chinese' },
          { title: 'Italian', value: 'italian' },
          { title: 'African', value: 'african' },
          { title: 'Seafood', value: 'seafood' },
          { title: 'Vegetarian', value: 'vegetarian' },
          { title: 'Vegan', value: 'vegan' },
          { title: 'Halal', value: 'halal' },
          { title: 'Cafe', value: 'cafe' },
          { title: 'Bakery', value: 'bakery' },
          { title: 'Fine Dining', value: 'fine-dining' },
          { title: 'Casual Dining', value: 'casual-dining' },
          { title: 'Street Food', value: 'street-food' },
          { title: 'Healthy', value: 'healthy' },
          { title: 'Desserts', value: 'desserts' },
          { title: 'Drinks', value: 'drinks' },
        ],
      },
    }),

    // -----------------------------------------------------------------------
    // Location
    // -----------------------------------------------------------------------
    defineField({
      name: 'address',
      title: 'Address',
      type: 'object',
      fields: [
        { name: 'street', title: 'Street Address', type: 'string' },
        { name: 'suburb', title: 'Suburb', type: 'string' },
        { name: 'city', title: 'City', type: 'string' },
        { name: 'province', title: 'Province', type: 'string' },
        { name: 'postalCode', title: 'Postal Code', type: 'string' },
        { name: 'lat', title: 'Latitude', type: 'number' },
        { name: 'lng', title: 'Longitude', type: 'number' },
      ],
    }),
    defineField({
      name: 'deliveryRadius',
      title: 'Delivery Radius (km)',
      type: 'number',
      description: 'Maximum delivery distance in kilometers',
      validation: (rule) => rule.min(1).max(50),
      initialValue: 10,
    }),

    // -----------------------------------------------------------------------
    // Operations
    // -----------------------------------------------------------------------
    defineField({
      name: 'operatingHours',
      title: 'Operating Hours',
      type: 'array',
      of: [{ type: 'operatingHours' }],
    }),
    defineField({
      name: 'minimumOrder',
      title: 'Minimum Order Amount (ZAR)',
      type: 'number',
      validation: (rule) => rule.min(0),
      initialValue: 50,
    }),
    defineField({
      name: 'avgDeliveryTime',
      title: 'Average Delivery Time (minutes)',
      type: 'number',
      description: 'Estimated average delivery time',
      initialValue: 30,
    }),
    defineField({
      name: 'commissionRate',
      title: 'Platform Commission Rate',
      type: 'number',
      description: 'Percentage (e.g., 15 for 15%)',
      validation: (rule) => rule.min(0).max(100),
      initialValue: 15,
      readOnly: true,
    }),

    // -----------------------------------------------------------------------
    // Status
    // -----------------------------------------------------------------------
    defineField({
      name: 'isActive',
      title: 'Active',
      type: 'boolean',
      description: 'Whether the restaurant is visible on the platform',
      initialValue: true,
    }),
    defineField({
      name: 'isFeatured',
      title: 'Featured',
      type: 'boolean',
      description: 'Show in featured restaurants section',
      initialValue: false,
    }),
    defineField({
      name: 'rating',
      title: 'Average Rating',
      type: 'number',
      description: 'Customer rating (1-5)',
      readOnly: true,
    }),
    defineField({
      name: 'totalOrders',
      title: 'Total Orders',
      type: 'number',
      readOnly: true,
      initialValue: 0,
    }),

    // -----------------------------------------------------------------------
    // Contact
    // -----------------------------------------------------------------------
    defineField({
      name: 'phone',
      title: 'Contact Phone',
      type: 'string',
    }),
    defineField({
      name: 'email',
      title: 'Contact Email',
      type: 'string',
      validation: (rule) => rule.email(),
    }),
    defineField({
      name: 'website',
      title: 'Website',
      type: 'url',
    }),

    // -----------------------------------------------------------------------
    // SEO
    // -----------------------------------------------------------------------
    defineField({
      name: 'seoTitle',
      title: 'SEO Title',
      type: 'string',
      description: 'Custom meta title (defaults to restaurant name)',
      validation: (rule) => rule.max(70),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO Description',
      type: 'text',
      description: 'Custom meta description',
      validation: (rule) => rule.max(160),
    }),
  ],

  preview: {
    select: {
      title: 'name',
      subtitle: 'address.city',
      media: 'logo',
    },
  },
});
