/**
 * Sanity Schema - Menu Item document type.
 *
 * Individual dishes/items within a menu category.
 * Images stored via Cloudinary integration for optimised delivery.
 *
 * @see docs/specs/14_RESTAURANT_STOREFRONT_SPEC.md
 * @module web-storefronts/sanity
 */

import { defineType, defineField } from 'sanity';

export const menuItem = defineType({
  name: 'menuItem',
  title: 'Menu Item',
  type: 'document',
  fields: [
    defineField({
      name: 'name',
      title: 'Item Name',
      type: 'string',
      validation: (rule) => rule.required().min(2).max(100),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 100 },
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'reference',
      to: [{ type: 'menuCategory' }],
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
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.max(300),
    }),
    defineField({
      name: 'price',
      title: 'Price (ZAR)',
      type: 'number',
      validation: (rule) => rule.required().min(0),
    }),
    defineField({
      name: 'discountPrice',
      title: 'Discount Price (ZAR)',
      type: 'number',
      description: 'Leave empty if no discount',
    }),
    defineField({
      name: 'image',
      title: 'Item Image',
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
      name: 'cloudinaryUrl',
      title: 'Cloudinary Image URL',
      type: 'url',
      description: 'Cloudinary-hosted image URL for CDN delivery',
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
    defineField({
      name: 'allergens',
      title: 'Allergens',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Gluten', value: 'gluten' },
          { title: 'Dairy', value: 'dairy' },
          { title: 'Nuts', value: 'nuts' },
          { title: 'Eggs', value: 'eggs' },
          { title: 'Soy', value: 'soy' },
          { title: 'Shellfish', value: 'shellfish' },
          { title: 'Fish', value: 'fish' },
        ],
      },
    }),
    defineField({
      name: 'dietaryFlags',
      title: 'Dietary Flags',
      type: 'array',
      of: [{ type: 'string' }],
      options: {
        list: [
          { title: 'Vegetarian', value: 'vegetarian' },
          { title: 'Vegan', value: 'vegan' },
          { title: 'Halal', value: 'halal' },
          { title: 'Kosher', value: 'kosher' },
          { title: 'Gluten Free', value: 'gluten_free' },
        ],
      },
    }),
    defineField({
      name: 'preparationTime',
      title: 'Preparation Time (minutes)',
      type: 'number',
      initialValue: 15,
    }),
    defineField({
      name: 'isAvailable',
      title: 'Available',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'isPopular',
      title: 'Popular',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'sortOrder',
      title: 'Sort Order',
      type: 'number',
      initialValue: 0,
    }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'price',
      media: 'image',
    },
    prepare({ title, subtitle, media }) {
      return {
        title,
        subtitle: subtitle ? `R${subtitle}` : 'No price',
        media,
      };
    },
  },
});
