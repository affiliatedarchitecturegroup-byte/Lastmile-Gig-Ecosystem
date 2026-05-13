/**
 * Sanity Schema barrel export.
 * @module web-storefronts/sanity
 */

import { restaurant } from './restaurant';
import { menuCategory } from './menu-category';
import { menuItem } from './menu-item';
import { operatingHours } from './operating-hours';

export const schemaTypes = [restaurant, menuCategory, menuItem, operatingHours];
