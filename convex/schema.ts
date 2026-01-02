import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// =============================================================================
// CONVEX MEDICAL STARTER SCHEMA
// =============================================================================
// Includes:
// - Auth tables (Convex Auth)
// - Semble cache tables (for offline/fast access)
// - Example tables
// =============================================================================

export default defineSchema({
  // ---------------------------------------------------------------------------
  // Auth Tables (required by @convex-dev/auth)
  // ---------------------------------------------------------------------------
  ...authTables,

  // ---------------------------------------------------------------------------
  // Semble Cache Tables
  // ---------------------------------------------------------------------------
  // Cache Semble data locally for faster access and offline support
  // These are synced periodically from Semble's GraphQL API
  
  semblePatients: defineTable({
    sembleId: v.string(),           // Semble's patient ID
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
    nhsNumber: v.optional(v.string()),
    lastSyncedAt: v.number(),       // Timestamp of last sync
  })
    .index("by_semble_id", ["sembleId"])
    .index("by_email", ["email"])
    .index("by_last_synced", ["lastSyncedAt"])
    .searchIndex("search_patients", {
      searchField: "firstName",
      filterFields: ["lastName"],
    }),

  sembleAppointments: defineTable({
    sembleId: v.string(),           // Semble's appointment ID
    patientSembleId: v.string(),    // Reference to patient
    practitionerId: v.string(),
    startTime: v.string(),          // ISO datetime
    endTime: v.string(),            // ISO datetime
    status: v.string(),             // scheduled, completed, cancelled, etc.
    type: v.optional(v.string()),
    notes: v.optional(v.string()),
    lastSyncedAt: v.number(),
  })
    .index("by_semble_id", ["sembleId"])
    .index("by_patient", ["patientSembleId"])
    .index("by_practitioner", ["practitionerId"])
    .index("by_start_time", ["startTime"])
    .index("by_status", ["status"]),

  // ---------------------------------------------------------------------------
  // Webhook Events (audit trail)
  // ---------------------------------------------------------------------------
  sembleWebhookEvents: defineTable({
    eventId: v.string(),            // Semble's event ID (for idempotency)
    eventType: v.string(),          // patient.created, appointment.scheduled, etc.
    payload: v.any(),               // Raw webhook payload
    processedAt: v.optional(v.number()),
    status: v.string(),             // pending, processed, failed
    error: v.optional(v.string()),
  })
    .index("by_event_id", ["eventId"])
    .index("by_event_type", ["eventType"])
    .index("by_status", ["status"]),

  // ---------------------------------------------------------------------------
  // Questionnaire Submissions
  // ---------------------------------------------------------------------------
  questionnaireSubmissions: defineTable({
    patientSembleId: v.string(),
    questionnaireType: v.string(),
    responses: v.array(
      v.object({
        questionId: v.string(),
        answer: v.string(),
      })
    ),
    submittedAt: v.number(),
    syncedToSemble: v.boolean(),
    sembleSubmissionId: v.optional(v.string()),
  })
    .index("by_patient", ["patientSembleId"])
    .index("by_type", ["questionnaireType"])
    .index("by_synced", ["syncedToSemble"]),

  // ---------------------------------------------------------------------------
  // Example Table (from starter)
  // ---------------------------------------------------------------------------
  numbers: defineTable({
    value: v.number(),
  }),
});
