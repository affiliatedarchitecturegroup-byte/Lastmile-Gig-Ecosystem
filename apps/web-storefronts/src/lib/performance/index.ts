/**
 * Performance Utilities - Barrel Export
 * @module web-storefronts/lib/performance
 */

export {
  MENU_ITEM_IMAGE_CONFIG,
  generateSrcSet,
  getCriticalImagePreloads,
  getOptimizedImageUrl,
  getPlaceholderUrl,
  getResponsiveSizes,
} from './image-optimizer';

export {
  PERFORMANCE_BUDGETS,
  WEB_VITALS_THRESHOLDS,
  createVitalsReporter,
  initWebVitals,
} from './web-vitals';

export type {
  CloudinaryOptions,
} from './image-optimizer';

export type {
  WebVitalEvent,
  WebVitalMetric,
} from './web-vitals';
