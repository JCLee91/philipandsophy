/**
 * React Query Key Constants
 *
 * Centralized query key management for React Query caching
 * - Type-safe query keys with factory functions
 * - Consistent naming and versioning
 * - Easy to search and refactor
 */

export const QUERY_KEYS = {
  /**
   * User reading submissions query key
   * @param userId - Participant ID
   * @param cohortId - Cohort ID
   */
  USER_SUBMISSIONS: (userId: string, cohortId: string) =>
    ['user-submissions', userId, cohortId] as const,

  /**
   * Featured participants query key
   * @param ids - Array of participant IDs
   * @param version - API version (default: v3)
   */
  FEATURED_PARTICIPANTS: (ids: string[], version = 'v3') =>
    ['featured-participants', version, ids] as const,
} as const;
