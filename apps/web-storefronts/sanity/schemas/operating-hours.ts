/**
 * Sanity Schema: Operating Hours Object (P177)
 *
 * Reusable object type for restaurant operating hours.
 * Embedded in the restaurant document as an array (one per day of week).
 *
 * @module web-storefronts/sanity/schemas/operating-hours
 */

import { defineType, defineField } from 'sanity';

export const operatingHours = defineType({
  name: 'operatingHours',
  title: 'Operating Hours',
  type: 'object',
  fields: [
    defineField({
      name: 'day',
      title: 'Day of Week',
      type: 'string',
      options: {
        list: [
          { title: 'Monday', value: 'monday' },
          { title: 'Tuesday', value: 'tuesday' },
          { title: 'Wednesday', value: 'wednesday' },
          { title: 'Thursday', value: 'thursday' },
          { title: 'Friday', value: 'friday' },
          { title: 'Saturday', value: 'saturday' },
          { title: 'Sunday', value: 'sunday' },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'isClosed',
      title: 'Closed',
      type: 'boolean',
      description: 'Is the restaurant closed on this day?',
      initialValue: false,
    }),
    defineField({
      name: 'openTime',
      title: 'Opening Time',
      type: 'string',
      description: 'Format: HH:MM (24-hour)',
      hidden: ({ parent }) => parent?.isClosed === true,
      validation: (rule) =>
        rule.regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
          name: 'time format',
          invert: false,
        }),
    }),
    defineField({
      name: 'closeTime',
      title: 'Closing Time',
      type: 'string',
      description: 'Format: HH:MM (24-hour)',
      hidden: ({ parent }) => parent?.isClosed === true,
      validation: (rule) =>
        rule.regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
          name: 'time format',
          invert: false,
        }),
    }),
    defineField({
      name: 'lastOrderTime',
      title: 'Last Order Time',
      type: 'string',
      description: 'Last time orders are accepted (HH:MM)',
      hidden: ({ parent }) => parent?.isClosed === true,
    }),
  ],
  preview: {
    select: {
      day: 'day',
      isClosed: 'isClosed',
      openTime: 'openTime',
      closeTime: 'closeTime',
    },
    prepare({ day, isClosed, openTime, closeTime }) {
      const dayCapitalized = day ? day.charAt(0).toUpperCase() + day.slice(1) : '';
      return {
        title: dayCapitalized,
        subtitle: isClosed ? 'Closed' : `${openTime || '??'} - ${closeTime || '??'}`,
      };
    },
  },
});
