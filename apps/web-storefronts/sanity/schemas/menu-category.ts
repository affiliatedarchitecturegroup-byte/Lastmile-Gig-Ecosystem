/**
 * Sanity Schema: Menu Category Document (P177)
 *
 * Represents a category grouping for menu items (e.g., "Starters",
 * "Mains", "Desserts", "Drinks"). Categories are displayed as
 * sticky navigation tabs on the storefront menu page.
 *
 * @module web-storefronts/sanity/schemas/menu-category
 */

import { defineType, defineField } from 'sanity';

export const menuCategory = defineType({
  name: 'menuCategory',
  title: 'Menu Category',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Category Name',
      type: 'string',
      description: 'e.g., Starters, Mains, Desserts, Drinks',
      validation: (rule) => rule.required().max(60),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 60 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      description: 'Optional category description',
      validation: (rule) => rule.max(200),
    }),
    defineField({
      name: 'restaurant',
      title: 'Restaurant',
      type: 'reference',
      to: [{ type: 'restaurant' }],
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'image',
      title: 'Category Image',
      type: 'cloudinary.asset',
      description: 'Optional category header image',
    }),
    defineField({
      name: 'displayOrder',
      title: 'Display Order',
      type: 'number',
      description: 'Sort order (lower = first)',
      initialValue: 0,
    }),
    defineField({
      name: 'isActive',
      title: 'Active',
      type: 'boolean',
      description: 'Whether this category is visible',
      initialValue: true,
    }),
    defineField({
      name: 'availableFrom',
      title: 'Available From',
      type: 'string',
      description: 'Time-based availability (e.g., "11:00" for lunch)',
    }),
    defineField({
      name: 'availableUntil',
      title: 'Available Until',
      type: 'string',
      description: 'Time-based availability (e.g., "14:00" for lunch)',
    }),
  ],

  orderings: [
    {
      title: 'Display Order',
      name: 'displayOrderAsc',
      by: [{ field: 'displayOrder', direction: 'asc' }],
    },
  ],

  preview: {
    select: {
      title: 'name',
      subtitle: 'restaurant.name',
      media: 'image',
    },
  },
});
