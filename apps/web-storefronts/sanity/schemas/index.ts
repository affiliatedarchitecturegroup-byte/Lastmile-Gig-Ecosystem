/**
 * Sanity Schema Registry (P176-P177)
 *
 * Exports all Sanity document and object schemas for the
 * restaurant storefront CMS.
 *
 * @module web-storefronts/sanity/schemas
 */

import { restaurant } from './restaurant';
import { menuCategory } from './menu-category';
import { menuItem } from './menu-item';
import { operatingHours } from './operating-hours';
import { deliveryZone } from './delivery-zone';
import { partnerSettings } from './partner-settings';

export const schemaTypes = [
  restaurant,
  menuCategory,
  menuItem,
  operatingHours,
  deliveryZone,
  partnerSettings,
];
