/**
 * Sanity Schema - Operating Hours object type.
 *
 * Embedded in the restaurant document to define daily operating hours.
 *
 * @module web-storefronts/sanity
 */

import { defineType, defineField } from 'sanity';

export const operatingHours = defineType({
  name: 'operatingHours',
  title: 'Operating Hours',
  type: 'object',
  fields: [
    defineField({
      name: 'day',
      title: 'Day',
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
      name: 'openTime',
      title: 'Open Time',
      type: 'string',
      description: 'Format: HH:MM (24-hour)',
      validation: (rule) => rule.required().regex(/^\d{2}:\d{2}$/),
    }),
    defineField({
      name: 'closeTime',
      title: 'Close Time',
      type: 'string',
      description: 'Format: HH:MM (24-hour)',
      validation: (rule) => rule.required().regex(/^\d{2}:\d{2}$/),
    }),
    defineField({
      name: 'isClosed',
      title: 'Closed',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  preview: {
    select: {
      day: 'day',
      openTime: 'openTime',
      closeTime: 'closeTime',
      isClosed: 'isClosed',
    },
    prepare({ day, openTime, closeTime, isClosed }) {
      return {
        title: day ? day.charAt(0).toUpperCase() + day.slice(1) : 'Unknown',
        subtitle: isClosed ? 'Closed' : `${openTime} - ${closeTime}`,
      };
    },
  },
});
