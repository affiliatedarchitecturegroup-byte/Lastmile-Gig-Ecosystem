/**
 * Sanity Schema: Delivery Zone Object (P177)
 *
 * Defines delivery zones with distance-based pricing for restaurants.
 * Partners can configure multiple delivery tiers.
 *
 * @module web-storefronts/sanity/schemas/delivery-zone
 */

import { defineType, defineField } from 'sanity';

export const deliveryZone = defineType({
  name: 'deliveryZone',
  title: 'Delivery Zone',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Zone Name',
      type: 'string',
      description: 'e.g., "Nearby (0-3km)", "Standard (3-7km)", "Extended (7-15km)"',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'restaurant',
      title: 'Restaurant',
      type: 'reference',
      to: [{ type: 'restaurant' }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'minDistanceKm',
      title: 'Minimum Distance (km)',
      type: 'number',
      validation: (rule) => rule.min(0),
      initialValue: 0,
    }),
    defineField({
      name: 'maxDistanceKm',
      title: 'Maximum Distance (km)',
      type: 'number',
      validation: (rule) => rule.required().positive(),
    }),
    defineField({
      name: 'deliveryFee',
      title: 'Delivery Fee (ZAR)',
      type: 'number',
      validation: (rule) => rule.required().min(0),
    }),
    defineField({
      name: 'estimatedMinutes',
      title: 'Estimated Delivery Time (minutes)',
      type: 'number',
      validation: (rule) => rule.positive(),
    }),
    defineField({
      name: 'isActive',
      title: 'Active',
      type: 'boolean',
      initialValue: true,
    }),
  ],
  preview: {
    select: {
      title: 'name',
      fee: 'deliveryFee',
      max: 'maxDistanceKm',
    },
    prepare({ title, fee, max }) {
      return {
        title: title || 'Unnamed Zone',
        subtitle: `R${fee ?? 0} - up to ${max ?? '?'}km`,
      };
    },
  },
});
