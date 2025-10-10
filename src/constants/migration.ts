/**
 * Migration Script Constants
 *
 * Centralized configuration for database and image migration scripts
 */

export const MIGRATION_CONFIG = {
  /** Delay before destructive operations start (ms) */
  SAFETY_DELAY: 3000,

  /** WebP conversion quality (0-100) */
  IMAGE_QUALITY: 85,

  /** CDN cache duration (1 year in seconds) */
  CACHE_MAX_AGE: 31536000,

  /** Maximum file size for image uploads (5MB in bytes) */
  MAX_FILE_SIZE: 5 * 1024 * 1024,

  /** Firestore batch write limit */
  BATCH_SIZE: 500,
} as const;

export const IMAGE_CONFIG = {
  /** Supported image formats */
  SUPPORTED_FORMATS: ['jpg', 'jpeg', 'png', 'webp'] as const,

  /** Storage paths */
  STORAGE_PATHS: {
    PROFILES: 'profiles',
    SUBMISSIONS: 'reading_submissions',
  } as const,

  /** File extensions */
  EXTENSIONS: {
    WEBP: '.webp',
    ORIGINAL: '_original.jpg',
  } as const,
} as const;

export const UI_CONFIG = {
  /** Modal image max height (viewport units) */
  MODAL_IMAGE_MAX_HEIGHT: 80,

  /** Loading animation duration (ms) */
  IMAGE_FADE_DURATION: 300,
} as const;
