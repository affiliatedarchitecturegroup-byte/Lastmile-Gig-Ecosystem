/**
 * Image Optimization Utilities
 * @module web-storefronts/lib/performance/image-optimizer
 * @description Cloudinary image URL generation with responsive sizing and WebP
 * @phase P204 - Storefront Performance Optimisation
 */

/** Cloudinary transformation options */
export interface CloudinaryOptions {
  readonly width?: number;
  readonly height?: number;
  readonly quality?: 'auto' | 'auto:low' | 'auto:eco' | 'auto:good' | 'auto:best' | number;
  readonly format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  readonly crop?: 'fill' | 'fit' | 'scale' | 'thumb' | 'limit';
  readonly gravity?: 'auto' | 'face' | 'center';
  readonly blur?: number;
  readonly placeholder?: boolean;
  readonly dpr?: 'auto' | number;
}

/** Responsive breakpoints for srcSet generation */
const RESPONSIVE_BREAKPOINTS: ReadonlyArray<number> = [
  320, 480, 640, 768, 1024, 1280, 1536, 1920,
];

/** Cloudinary base URL */
const CLOUDINARY_BASE = 'https://res.cloudinary.com/lastmilegig/image/upload';

/**
 * Build Cloudinary transformation string from options
 */
function buildTransformations(options: CloudinaryOptions): string {
  const transforms: string[] = [];

  if (options.width) transforms.push(`w_${String(options.width)}`);
  if (options.height) transforms.push(`h_${String(options.height)}`);
  if (options.quality) transforms.push(`q_${String(options.quality)}`);
  if (options.format) transforms.push(`f_${String(options.format)}`);
  if (options.crop) transforms.push(`c_${options.crop}`);
  if (options.gravity) transforms.push(`g_${options.gravity}`);
  if (options.blur) transforms.push(`e_blur:${String(options.blur)}`);
  if (options.dpr) transforms.push(`dpr_${String(options.dpr)}`);

  return transforms.join(',');
}

/**
 * Generate an optimized Cloudinary URL with transformations
 *
 * @param publicId - Cloudinary public ID of the image
 * @param options - Transformation options
 * @returns Optimized image URL
 */
export function getOptimizedImageUrl(
  publicId: string,
  options: CloudinaryOptions = {},
): string {
  const defaults: CloudinaryOptions = {
    quality: 'auto',
    format: 'auto',
    crop: 'fill',
    dpr: 'auto',
    ...options,
  };

  const transformations = buildTransformations(defaults);
  return `${CLOUDINARY_BASE}/${transformations}/${publicId}`;
}

/**
 * Generate a low-quality image placeholder (LQIP) URL
 * Used for blur-up loading effect
 *
 * @param publicId - Cloudinary public ID
 * @returns Blurred placeholder URL (20px wide)
 */
export function getPlaceholderUrl(publicId: string): string {
  return getOptimizedImageUrl(publicId, {
    width: 20,
    quality: 'auto:low',
    format: 'webp',
    blur: 1000,
  });
}

/**
 * Generate responsive srcSet for Next.js Image component
 *
 * @param publicId - Cloudinary public ID
 * @param options - Base transformation options
 * @returns srcSet string for responsive images
 */
export function generateSrcSet(
  publicId: string,
  options: CloudinaryOptions = {},
): string {
  return RESPONSIVE_BREAKPOINTS.map((width) => {
    const url = getOptimizedImageUrl(publicId, {
      ...options,
      width,
    });
    return `${url} ${String(width)}w`;
  }).join(', ');
}

/**
 * Generate sizes attribute for common layouts
 */
export function getResponsiveSizes(
  layout: 'full' | 'half' | 'third' | 'card' | 'hero',
): string {
  switch (layout) {
    case 'full':
      return '100vw';
    case 'half':
      return '(max-width: 768px) 100vw, 50vw';
    case 'third':
      return '(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw';
    case 'card':
      return '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw';
    case 'hero':
      return '100vw';
    default:
      return '100vw';
  }
}

/**
 * Menu item image configuration
 * Optimized sizes for menu cards in the storefront
 */
export const MENU_ITEM_IMAGE_CONFIG = {
  thumbnail: { width: 150, height: 150, crop: 'thumb' as const, gravity: 'auto' as const },
  card: { width: 400, height: 300, crop: 'fill' as const, gravity: 'auto' as const },
  detail: { width: 800, height: 600, crop: 'fill' as const, gravity: 'auto' as const },
  hero: { width: 1920, height: 600, crop: 'fill' as const, gravity: 'auto' as const },
} as const;

/**
 * Preload critical images for above-the-fold content
 * Returns link elements for the document head
 */
export function getCriticalImagePreloads(
  publicIds: ReadonlyArray<string>,
): ReadonlyArray<{ rel: string; href: string; as: string; type: string }> {
  return publicIds.map((publicId) => ({
    rel: 'preload',
    href: getOptimizedImageUrl(publicId, {
      width: 1200,
      format: 'webp',
      quality: 'auto:good',
    }),
    as: 'image',
    type: 'image/webp',
  }));
}
