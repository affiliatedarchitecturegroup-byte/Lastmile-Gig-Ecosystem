/**
 * Sanity Schema: Menu Item Document (P177)
 *
 * Individual food/drink item within a menu category. Each item
 * has pricing, dietary information, allergen warnings, preparation
 * time, and Cloudinary-hosted food photography.
 *
 * Cloudinary integration (P178):
 * - Images uploaded via Sanity's Cloudinary plugin
 * - Automatic WebP conversion + responsive sizing
 * - Lazy loading on the storefront via Next.js Image
 *
 * @module web-storefronts/sanity/schemas/menu-item
 */

import { defineType, defineField } from 'sanity';

export const menuItem = defineType({
  name: 'menuItem',
  title: 'Menu Item',
  type: 'document',
  fields: [
    // -----------------------------------------------------------------------
    // Core fields
    // -----------------------------------------------------------------------
    defineField({
      name: 'name',
      title: 'Item Name',
      type: 'string',
      validation: (rule) => rule.required().max(80),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'name', maxLength: 80 },
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      description: 'Brief description of the item',
      validation: (rule) => rule.max(300),
    }),
    defineField({
      name: 'price',
      title: 'Price (ZAR)',
      type: 'number',
      validation: (rule) => rule.required().positive(),
    }),

    // -----------------------------------------------------------------------
    // Images (Cloudinary - P178)
    // -----------------------------------------------------------------------
    defineField({
      name: 'images',
      title: 'Food Images',
      type: 'array',
      of: [{ type: 'cloudinary.asset' }],
      description: 'Upload high-quality food photos (min 800x600px). First image is the primary.',
      validation: (rule) => rule.max(5),
    }),

    // -----------------------------------------------------------------------
    // Categorisation
    // -----------------------------------------------------------------------
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

    // -----------------------------------------------------------------------
    // Dietary & Allergens
    // -----------------------------------------------------------------------
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
          { title: 'Sesame', value: 'sesame' },
        ],
      },
    }),
    defineField({
      name: 'isVegetarian',
      title: 'Vegetarian',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'isVegan',
      title: 'Vegan',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'isHalal',
      title: 'Halal',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'isKosher',
      title: 'Kosher',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'isSpicy',
      title: 'Spicy',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'spiceLevel',
      title: 'Spice Level',
      type: 'number',
      description: '1-5 (mild to extremely hot)',
      hidden: ({ document }) => !document?.isSpicy,
      validation: (rule) => rule.min(1).max(5),
    }),

    // -----------------------------------------------------------------------
    // Customisation options
    // -----------------------------------------------------------------------
    defineField({
      name: 'options',
      title: 'Customisation Options',
      type: 'array',
      of: [
        {
          type: 'object',
          fields: [
            { name: 'name', title: 'Option Group', type: 'string' },
            { name: 'required', title: 'Required', type: 'boolean', initialValue: false },
            { name: 'maxSelections', title: 'Max Selections', type: 'number', initialValue: 1 },
            {
              name: 'choices',
              title: 'Choices',
              type: 'array',
              of: [
                {
                  type: 'object',
                  fields: [
                    { name: 'label', title: 'Label', type: 'string' },
                    { name: 'priceAdjustment', title: 'Price Adjustment (ZAR)', type: 'number', initialValue: 0 },
                  ],
                },
              ],
            },
          ],
        },
      ],
    }),

    // -----------------------------------------------------------------------
    // Operations
    // -----------------------------------------------------------------------
    defineField({
      name: 'preparationTime',
      title: 'Preparation Time (minutes)',
      type: 'number',
      description: 'Estimated preparation time',
      initialValue: 15,
    }),
    defineField({
      name: 'isAvailable',
      title: 'Available',
      type: 'boolean',
      description: 'Whether this item can be ordered right now',
      initialValue: true,
    }),
    defineField({
      name: 'displayOrder',
      title: 'Display Order',
      type: 'number',
      description: 'Sort order within category (lower = first)',
      initialValue: 0,
    }),

    // -----------------------------------------------------------------------
    // Nutritional info (optional)
    // -----------------------------------------------------------------------
    defineField({
      name: 'nutritionalInfo',
      title: 'Nutritional Information',
      type: 'object',
      fields: [
        { name: 'calories', title: 'Calories (kcal)', type: 'number' },
        { name: 'protein', title: 'Protein (g)', type: 'number' },
        { name: 'carbs', title: 'Carbohydrates (g)', type: 'number' },
        { name: 'fat', title: 'Fat (g)', type: 'number' },
        { name: 'fiber', title: 'Fiber (g)', type: 'number' },
      ],
    }),

    // -----------------------------------------------------------------------
    // Popularity (read-only, updated by analytics)
    // -----------------------------------------------------------------------
    defineField({
      name: 'orderCount',
      title: 'Times Ordered',
      type: 'number',
      readOnly: true,
      initialValue: 0,
    }),
  ],

  orderings: [
    {
      title: 'Display Order',
      name: 'displayOrderAsc',
      by: [{ field: 'displayOrder', direction: 'asc' }],
    },
    {
      title: 'Most Popular',
      name: 'orderCountDesc',
      by: [{ field: 'orderCount', direction: 'desc' }],
    },
    {
      title: 'Price (Low to High)',
      name: 'priceAsc',
      by: [{ field: 'price', direction: 'asc' }],
    },
  ],

  preview: {
    select: {
      title: 'name',
      subtitle: 'price',
      media: 'images.0',
    },
    prepare({ title, subtitle }) {
      return {
        title,
        subtitle: subtitle ? `R${subtitle.toFixed(2)}` : 'No price',
      };
    },
  },
});
