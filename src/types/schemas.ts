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

// v2.0 / v1.0 Participant assignment (2 similar + 2 opposite IDs)
export const LegacyParticipantAssignmentSchema = z.object({
  similar: z.array(z.string()).min(2).max(2),
  opposite: z.array(z.string()).min(2).max(2),
  reasons: DailyMatchingReasonsSchema.optional(),
});

// v3.0 Cluster Assignment (List of assigned IDs + clusterId)
export const ClusterParticipantAssignmentSchema = z.object({
  assigned: z.array(z.string()),
  clusterId: z.string(),
});

// Union of assignment types
export const DailyParticipantAssignmentSchema = z.union([
  LegacyParticipantAssignmentSchema,
  ClusterParticipantAssignmentSchema,
]);

// Cluster definition (for v3.0)
export const ClusterSchema = z.object({
  id: z.string(),
  name: z.string(),
  emoji: z.string(),
  category: z.string(),
  theme: z.string(),
  reasoning: z.string(),
  memberIds: z.array(z.string()),
  // Legacy fields (optional for backward compatibility)
  reason: z.string().optional(),
  keywords: z.array(z.string()).optional(),
});

// Complete matching result
export const MatchingSchema = z.object({
  assignments: z.record(z.string(), DailyParticipantAssignmentSchema),
  clusters: z.record(z.string(), ClusterSchema).optional(),
  matchingVersion: z.string().optional(),
});

/**
 * TypeScript types inferred from Zod schemas
 * Single source of truth - schemas define both validation and types
 */
export type DailyMatchingReasons = z.infer<typeof DailyMatchingReasonsSchema>;
export type DailyParticipantAssignment = z.infer<typeof DailyParticipantAssignmentSchema>;
export type MatchingData = z.infer<typeof MatchingSchema>;
export type Cluster = z.infer<typeof ClusterSchema>;
