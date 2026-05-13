/**
 * Sanity Schema: Partner Settings Document (P177)
 *
 * Partner-level configuration that controls storefront behavior,
 * notifications, and integration settings. One per restaurant.
 *
 * @module web-storefronts/sanity/schemas/partner-settings
 */

import { defineType, defineField } from 'sanity';

export const partnerSettings = defineType({
  name: 'partnerSettings',
  title: 'Partner Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'restaurant',
      title: 'Restaurant',
      type: 'reference',
      to: [{ type: 'restaurant' }],
      validation: (rule) => rule.required(),
    }),

    // -----------------------------------------------------------------------
    // Order settings
    // -----------------------------------------------------------------------
    defineField({
      name: 'autoAcceptOrders',
      title: 'Auto-Accept Orders',
      type: 'boolean',
      description: 'Automatically accept incoming orders without manual confirmation',
      initialValue: false,
    }),
    defineField({
      name: 'orderNotificationSound',
      title: 'Order Notification Sound',
      type: 'boolean',
      description: 'Play sound on new order',
      initialValue: true,
    }),
    defineField({
      name: 'maxConcurrentOrders',
      title: 'Maximum Concurrent Orders',
      type: 'number',
      description: 'Maximum number of orders the kitchen can handle simultaneously',
      validation: (rule) => rule.min(1).max(100),
      initialValue: 20,
    }),
    defineField({
      name: 'orderPrepBuffer',
      title: 'Order Preparation Buffer (minutes)',
      type: 'number',
      description: 'Extra time added to estimated prep time',
      initialValue: 5,
    }),

    // -----------------------------------------------------------------------
    // Payment settings
    // -----------------------------------------------------------------------
    defineField({
      name: 'acceptCash',
      title: 'Accept Cash on Delivery',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'acceptCard',
      title: 'Accept Card Payments',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'payoutPreference',
      title: 'Payout Preference',
      type: 'string',
      options: {
        list: [
          { title: 'Weekly (Monday)', value: 'weekly' },
          { title: 'Bi-weekly', value: 'biweekly' },
          { title: 'Monthly', value: 'monthly' },
          { title: 'Instant (Ozow)', value: 'instant' },
        ],
      },
      initialValue: 'weekly',
    }),

    // -----------------------------------------------------------------------
    // Notification preferences
    // -----------------------------------------------------------------------
    defineField({
      name: 'emailNotifications',
      title: 'Email Notifications',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'smsNotifications',
      title: 'SMS Notifications',
      type: 'boolean',
      initialValue: true,
    }),
    defineField({
      name: 'whatsappNotifications',
      title: 'WhatsApp Notifications',
      type: 'boolean',
      initialValue: false,
    }),

    // -----------------------------------------------------------------------
    // Branding overrides
    // -----------------------------------------------------------------------
    defineField({
      name: 'primaryColor',
      title: 'Primary Brand Color',
      type: 'string',
      description: 'Hex color code (e.g., #FF6B00)',
      validation: (rule) =>
        rule.regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
          name: 'hex color',
          invert: false,
        }),
    }),
    defineField({
      name: 'secondaryColor',
      title: 'Secondary Brand Color',
      type: 'string',
      validation: (rule) =>
        rule.regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
          name: 'hex color',
          invert: false,
        }),
    }),
  ],
  preview: {
    select: {
      restaurant: 'restaurant.name',
    },
    prepare({ restaurant }) {
      return {
        title: `Settings: ${restaurant || 'Unknown'}`,
      };
    },
  },
});
