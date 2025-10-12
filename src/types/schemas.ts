import { z } from 'zod';

/**
 * Zod schemas for AI matching data validation
 *
 * These schemas define the structure and validation rules for matching results.
 * TypeScript types are automatically inferred using z.infer<typeof Schema>.
 */

// Daily matching reasons (similar/opposite/summary)
export const DailyMatchingReasonsSchema = z.object({
  similar: z.string().optional(),
  opposite: z.string().optional(),
  summary: z.string().optional(),
});

// Participant assignment (2 similar + 2 opposite IDs)
export const DailyParticipantAssignmentSchema = z.object({
  similar: z.array(z.string()).min(2).max(2),
  opposite: z.array(z.string()).min(2).max(2),
  reasons: DailyMatchingReasonsSchema.optional(),
});

// Complete matching result (featured + all assignments)
export const MatchingSchema = z.object({
  featured: z.object({
    similar: z.array(z.string()).min(2).max(2),
    opposite: z.array(z.string()).min(2).max(2),
    reasons: DailyMatchingReasonsSchema.optional(),
  }),
  assignments: z.record(z.string(), DailyParticipantAssignmentSchema),
});

/**
 * TypeScript types inferred from Zod schemas
 * Single source of truth - schemas define both validation and types
 */
export type DailyMatchingReasons = z.infer<typeof DailyMatchingReasonsSchema>;
export type DailyParticipantAssignment = z.infer<typeof DailyParticipantAssignmentSchema>;
export type MatchingData = z.infer<typeof MatchingSchema>;
