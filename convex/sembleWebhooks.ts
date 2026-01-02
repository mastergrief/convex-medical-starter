import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// =============================================================================
// SEMBLE WEBHOOK EVENT HANDLERS
// =============================================================================
// Internal functions for processing Semble webhook events
// Called by the HTTP webhook endpoint in http.ts
// =============================================================================

// -----------------------------------------------------------------------------
// Event Management
// -----------------------------------------------------------------------------

export const getEventById = internalQuery({
  args: { eventId: v.string() },
  handler: async (ctx, { eventId }) => {
    return await ctx.db
      .query("sembleWebhookEvents")
      .withIndex("by_event_id", (q) => q.eq("eventId", eventId))
      .first();
  },
});

export const createEvent = internalMutation({
  args: {
    eventId: v.string(),
    eventType: v.string(),
    payload: v.any(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sembleWebhookEvents", args);
  },
});

export const markEventProcessed = internalMutation({
  args: { eventId: v.string() },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db
      .query("sembleWebhookEvents")
      .withIndex("by_event_id", (q) => q.eq("eventId", eventId))
      .first();

    if (event) {
      await ctx.db.patch(event._id, {
        status: "processed",
        processedAt: Date.now(),
      });
    }
  },
});

export const markEventFailed = internalMutation({
  args: {
    eventId: v.string(),
    error: v.string(),
  },
  handler: async (ctx, { eventId, error }) => {
    const event = await ctx.db
      .query("sembleWebhookEvents")
      .withIndex("by_event_id", (q) => q.eq("eventId", eventId))
      .first();

    if (event) {
      await ctx.db.patch(event._id, {
        status: "failed",
        error,
        processedAt: Date.now(),
      });
    }
  },
});

// -----------------------------------------------------------------------------
// Patient Event Processing
// -----------------------------------------------------------------------------

export const processPatientEvent = internalMutation({
  args: {
    eventId: v.string(),
    data: v.any(),
  },
  handler: async (ctx, { data }) => {
    const patientData = data as {
      id: string;
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      dateOfBirth?: string;
      nhsNumber?: string;
    };

    // Upsert patient in cache
    const existing = await ctx.db
      .query("semblePatients")
      .withIndex("by_semble_id", (q) => q.eq("sembleId", patientData.id))
      .first();

    const patientRecord = {
      sembleId: patientData.id,
      firstName: patientData.firstName,
      lastName: patientData.lastName,
      email: patientData.email,
      phone: patientData.phone,
      dateOfBirth: patientData.dateOfBirth,
      nhsNumber: patientData.nhsNumber,
      lastSyncedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, patientRecord);
    } else {
      await ctx.db.insert("semblePatients", patientRecord);
    }
  },
});

// -----------------------------------------------------------------------------
// Appointment Event Processing
// -----------------------------------------------------------------------------

export const processAppointmentEvent = internalMutation({
  args: {
    eventId: v.string(),
    data: v.any(),
  },
  handler: async (ctx, { data }) => {
    const appointmentData = data as {
      id: string;
      patientId: string;
      practitionerId: string;
      startTime: string;
      endTime: string;
      status: string;
      type?: string;
      notes?: string;
    };

    // Upsert appointment in cache
    const existing = await ctx.db
      .query("sembleAppointments")
      .withIndex("by_semble_id", (q) => q.eq("sembleId", appointmentData.id))
      .first();

    const appointmentRecord = {
      sembleId: appointmentData.id,
      patientSembleId: appointmentData.patientId,
      practitionerId: appointmentData.practitionerId,
      startTime: appointmentData.startTime,
      endTime: appointmentData.endTime,
      status: appointmentData.status,
      type: appointmentData.type,
      notes: appointmentData.notes,
      lastSyncedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, appointmentRecord);
    } else {
      await ctx.db.insert("sembleAppointments", appointmentRecord);
    }
  },
});

// -----------------------------------------------------------------------------
// Retry Failed Events
// -----------------------------------------------------------------------------

export const getFailedEvents = internalQuery({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit = 50 }) => {
    return await ctx.db
      .query("sembleWebhookEvents")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .take(limit);
  },
});
