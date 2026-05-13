/**
 * Sanity Schema - Restaurant document type.
 *
 * Represents a restaurant/partner on the Lastmile Gig platform.
 * Each restaurant has a unique slug used for its storefront URL:
 * /store/[slug]
 *
 * @see docs/specs/14_RESTAURANT_STOREFRONT_SPEC.md
 * @module web-storefronts/sanity
 */

import { defineType, defineField } from 'sanity';

export const restaurant = defineType({
  name: 'restaurant',
  title: 'Restaurant',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Restaurant Name',
      type: 'string',
      validation: (rule) => rule.required().min(2).max(100),
    }),
    defineField({
      name: 'slug',
      title: 'URL Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.max(500),
    }),
    defineField({
      name: 'partnerId',
      title: 'Partner ID (Supabase)',
      type: 'string',
      description: 'UUID from the partners table in Supabase',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'partnerType',
      title: 'Partner Type',
      type: 'string',
      options: {
        list: [
          { title: 'Restaurant', value: 'restaurant' },
          { title: 'Cafe', value: 'cafe' },
          { title: 'Fast Food', value: 'fastfood' },
          { title: 'Fine Dining', value: 'finedining' },
          { title: 'Hotel', value: 'hotel' },
          { title: 'Ghost Kitchen', value: 'ghost_kitchen' },
          { title: 'Bakery', value: 'bakery' },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero Image',
      type: 'image',
      options: { hotspot: true },
      fields: [
        {
          name: 'alt',
          title: 'Alt Text',
          type: 'string',
        },
      ],
    }),
    defineField({
      name: 'logo',
      title: 'Logo',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'cuisine',
      title: 'Cuisine Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        layout: 'tags',
      },
    }),
    defineField({
      name: 'address',
      title: 'Address',
      type: 'object',
      fields: [
        { name: 'street', title: 'Street', type: 'string' },
        { name: 'city', title: 'City', type: 'string' },
        { name: 'province', title: 'Province', type: 'string' },
        { name: 'postalCode', title: 'Postal Code', type: 'string' },
        { name: 'latitude', title: 'Latitude', type: 'number' },
        { name: 'longitude', title: 'Longitude', type: 'number' },
      ],
    }),
    defineField({
      name: 'phone',
      title: 'Phone Number',
      type: 'string',
    }),
    defineField({
      name: 'email',
      title: 'Email',
      type: 'string',
    }),
    defineField({
      name: 'operatingHours',
      title: 'Operating Hours',
      type: 'array',
      of: [{ type: 'operatingHours' }],
    }),
    defineField({
      name: 'deliveryRadius',
      title: 'Delivery Radius (km)',
      type: 'number',
      validation: (rule) => rule.min(1).max(50),
      initialValue: 10,
    }),
    defineField({
      name: 'minimumOrder',
      title: 'Minimum Order (ZAR)',
      type: 'number',
      validation: (rule) => rule.min(0),
      initialValue: 50,
    }),
    defineField({
      name: 'averageDeliveryTime',
      title: 'Average Delivery Time (minutes)',
      type: 'number',
      initialValue: 30,
    }),
    defineField({
      name: 'rating',
      title: 'Average Rating',
      type: 'number',
      validation: (rule) => rule.min(0).max(5),
      readOnly: true,
    }),
    defineField({
      name: 'isActive',
      title: 'Active',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'isFeatured',
      title: 'Featured',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'partnerType',
      media: 'logo',
    },
  },
});
