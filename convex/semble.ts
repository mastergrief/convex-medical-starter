import { v } from "convex/values";
import { action, internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// =============================================================================
// SEMBLE GRAPHQL API INTEGRATION
// =============================================================================
// Semble API Docs: https://docs.semble.io/
// Authentication: JWT tokens valid for 12 hours
// API Type: GraphQL
// =============================================================================

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

interface SembleTokenCache {
  token: string;
  expiresAt: number;
}

interface SemblePatient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  nhsNumber?: string;
}

interface SembleAppointment {
  id: string;
  patientId: string;
  practitionerId: string;
  startTime: string;
  endTime: string;
  status: string;
  type?: string;
  notes?: string;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; path?: string[] }>;
}

// -----------------------------------------------------------------------------
// Token Management (in-memory cache with 11-hour refresh)
// -----------------------------------------------------------------------------

let tokenCache: SembleTokenCache | null = null;

async function getSembleToken(): Promise<string> {
  const now = Date.now();
  
  // Return cached token if still valid (with 1-hour buffer)
  if (tokenCache && tokenCache.expiresAt > now) {
    return tokenCache.token;
  }

  const apiUrl = process.env.SEMBLE_API_URL;
  const clientId = process.env.SEMBLE_CLIENT_ID;
  const clientSecret = process.env.SEMBLE_CLIENT_SECRET;

  if (!apiUrl || !clientId || !clientSecret) {
    throw new Error(
      "Missing Semble credentials. Set SEMBLE_API_URL, SEMBLE_CLIENT_ID, and SEMBLE_CLIENT_SECRET"
    );
  }

  // Authenticate with Semble GraphQL API
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        mutation Login($email: String!, $password: String!) {
          login(email: $email, password: $password) {
            token
            expiresAt
          }
        }
      `,
      variables: {
        email: clientId,
        password: clientSecret,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Semble auth failed: ${response.status} ${response.statusText}`);
  }

  const result = (await response.json()) as GraphQLResponse<{
    login: { token: string; expiresAt?: string };
  }>;

  if (result.errors) {
    throw new Error(`Semble auth error: ${result.errors[0].message}`);
  }

  const token = result.data?.login.token;
  if (!token) {
    throw new Error("No token returned from Semble");
  }

  // Cache token for 11 hours (tokens last 12 hours)
  tokenCache = {
    token,
    expiresAt: now + 11 * 60 * 60 * 1000,
  };

  return token;
}

// -----------------------------------------------------------------------------
// Generic GraphQL Executor
// -----------------------------------------------------------------------------

async function executeSembleQuery<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const token = await getSembleToken();
  const apiUrl = process.env.SEMBLE_API_URL!;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`Semble API error: ${response.status} ${response.statusText}`);
  }

  const result = (await response.json()) as GraphQLResponse<T>;

  if (result.errors) {
    throw new Error(`Semble GraphQL error: ${result.errors[0].message}`);
  }

  if (!result.data) {
    throw new Error("No data returned from Semble");
  }

  return result.data;
}

// -----------------------------------------------------------------------------
// Internal Actions (for use by other Convex functions)
// -----------------------------------------------------------------------------

export const sembleQuery = internalAction({
  args: {
    query: v.string(),
    variables: v.optional(v.any()),
  },
  handler: async (_ctx, { query, variables }) => {
    return await executeSembleQuery(query, variables);
  },
});

// -----------------------------------------------------------------------------
// Patient Operations
// -----------------------------------------------------------------------------

export const getPatient = action({
  args: { patientId: v.string() },
  handler: async (_ctx, { patientId }) => {
    const data = await executeSembleQuery<{ patient: SemblePatient }>(
      `
        query GetPatient($id: ID!) {
          patient(id: $id) {
            id
            firstName
            lastName
            dateOfBirth
            email
            phone
            nhsNumber
          }
        }
      `,
      { id: patientId }
    );
    return data.patient;
  },
});

export const listPatients = action({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (_ctx, { limit = 50, offset = 0 }) => {
    const data = await executeSembleQuery<{
      patients: { nodes: SemblePatient[]; totalCount: number };
    }>(
      `
        query ListPatients($limit: Int, $offset: Int) {
          patients(first: $limit, offset: $offset) {
            nodes {
              id
              firstName
              lastName
              dateOfBirth
              email
              phone
            }
            totalCount
          }
        }
      `,
      { limit, offset }
    );
    return data.patients;
  },
});

export const searchPatients = action({
  args: { searchTerm: v.string() },
  handler: async (_ctx, { searchTerm }) => {
    const data = await executeSembleQuery<{
      patients: { nodes: SemblePatient[] };
    }>(
      `
        query SearchPatients($search: String!) {
          patients(search: $search) {
            nodes {
              id
              firstName
              lastName
              email
              phone
            }
          }
        }
      `,
      { search: searchTerm }
    );
    return data.patients.nodes;
  },
});

// -----------------------------------------------------------------------------
// Appointment Operations
// -----------------------------------------------------------------------------

export const getAppointment = action({
  args: { appointmentId: v.string() },
  handler: async (_ctx, { appointmentId }) => {
    const data = await executeSembleQuery<{ appointment: SembleAppointment }>(
      `
        query GetAppointment($id: ID!) {
          appointment(id: $id) {
            id
            patientId
            practitionerId
            startTime
            endTime
            status
            type
            notes
          }
        }
      `,
      { id: appointmentId }
    );
    return data.appointment;
  },
});

export const listAppointments = action({
  args: {
    patientId: v.optional(v.string()),
    practitionerId: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (_ctx, { patientId, practitionerId, startDate, endDate }) => {
    const data = await executeSembleQuery<{
      appointments: { nodes: SembleAppointment[] };
    }>(
      `
        query ListAppointments(
          $patientId: ID
          $practitionerId: ID
          $startDate: DateTime
          $endDate: DateTime
        ) {
          appointments(
            patientId: $patientId
            practitionerId: $practitionerId
            startDate: $startDate
            endDate: $endDate
          ) {
            nodes {
              id
              patientId
              practitionerId
              startTime
              endTime
              status
              type
            }
          }
        }
      `,
      { patientId, practitionerId, startDate, endDate }
    );
    return data.appointments.nodes;
  },
});

// -----------------------------------------------------------------------------
// Sync Operations (cache Semble data in Convex)
// -----------------------------------------------------------------------------

export const upsertCachedPatient = internalMutation({
  args: {
    sembleId: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    dateOfBirth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("semblePatients")
      .withIndex("by_semble_id", (q) => q.eq("sembleId", args.sembleId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        lastSyncedAt: Date.now(),
      });
      return existing._id;
    }

    return await ctx.db.insert("semblePatients", {
      ...args,
      lastSyncedAt: Date.now(),
    });
  },
});

export const syncPatients = action({
  args: {},
  handler: async (ctx) => {
    const data = await executeSembleQuery<{
      patients: { nodes: SemblePatient[] };
    }>(
      `
        query SyncAllPatients {
          patients(first: 1000) {
            nodes {
              id
              firstName
              lastName
              email
              phone
              dateOfBirth
            }
          }
        }
      `
    );

    let synced = 0;
    for (const patient of data.patients.nodes) {
      await ctx.runMutation(internal.semble.upsertCachedPatient, {
        sembleId: patient.id,
        firstName: patient.firstName,
        lastName: patient.lastName,
        email: patient.email,
        phone: patient.phone,
        dateOfBirth: patient.dateOfBirth,
      });
      synced++;
    }

    return { synced, total: data.patients.nodes.length };
  },
});

// -----------------------------------------------------------------------------
// Questionnaire Submission (write to Semble)
// -----------------------------------------------------------------------------

export const submitQuestionnaire = action({
  args: {
    patientId: v.string(),
    questionnaireType: v.string(),
    responses: v.array(
      v.object({
        questionId: v.string(),
        answer: v.string(),
      })
    ),
  },
  handler: async (_ctx, { patientId, questionnaireType, responses }) => {
    const data = await executeSembleQuery<{
      submitQuestionnaire: { id: string; status: string };
    }>(
      `
        mutation SubmitQuestionnaire(
          $patientId: ID!
          $type: String!
          $responses: [QuestionnaireResponseInput!]!
        ) {
          submitQuestionnaire(
            patientId: $patientId
            type: $type
            responses: $responses
          ) {
            id
            status
          }
        }
      `,
      {
        patientId,
        type: questionnaireType,
        responses,
      }
    );
    return data.submitQuestionnaire;
  },
});
