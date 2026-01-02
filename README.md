# Convex Medical Starter

A full-stack starter template with **Convex** backend and **Semble** healthcare API integration.

## Features

- 🏥 **Semble Integration** - GraphQL API client with token caching
- 🔄 **Real-time Sync** - Webhook handlers for patient/appointment updates
- 💾 **Local Caching** - Convex tables for offline access and fast queries
- 🔐 **Convex Auth** - Built-in authentication (Password provider)
- ⚡ **React 19 + Vite** - Modern frontend stack
- 🎨 **Tailwind CSS v4** - Utility-first styling
- 📝 **TypeScript** - Full type safety with tsgo

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Semble credentials

# Start development
npm run dev
```

## Environment Variables

```bash
# Semble API (required for integration)
SEMBLE_API_URL=https://api.semble.io/graphql
SEMBLE_CLIENT_ID=your-semble-email
SEMBLE_CLIENT_SECRET=your-semble-password
SEMBLE_WEBHOOK_SECRET=your-webhook-secret

# Convex (auto-configured)
CONVEX_DEPLOYMENT=dev:your-deployment
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

## Project Structure

```
convex/
├── auth.ts              # Convex Auth setup
├── http.ts              # HTTP routes (auth + webhooks)
├── schema.ts            # Database schema
├── semble.ts            # Semble API integration
├── sembleWebhooks.ts    # Webhook event handlers
└── myFunctions.ts       # Example functions
```

## Semble Integration

### API Actions

```typescript
// Get a patient by ID
const patient = await ctx.runAction(api.semble.getPatient, { 
  patientId: "patient-123" 
});

// List patients with pagination
const { nodes, totalCount } = await ctx.runAction(api.semble.listPatients, {
  limit: 50,
  offset: 0,
});

// Search patients
const results = await ctx.runAction(api.semble.searchPatients, {
  searchTerm: "John",
});

// List appointments
const appointments = await ctx.runAction(api.semble.listAppointments, {
  patientId: "patient-123",
  startDate: "2026-01-01",
  endDate: "2026-01-31",
});

// Submit questionnaire to Semble
await ctx.runAction(api.semble.submitQuestionnaire, {
  patientId: "patient-123",
  questionnaireType: "intake",
  responses: [
    { questionId: "q1", answer: "Yes" },
    { questionId: "q2", answer: "No" },
  ],
});
```

### Sync Patients to Local Cache

```bash
# Via CLI
npm run semble:sync

# Or programmatically
await ctx.runAction(api.semble.syncPatients, {});
```

### Webhook Setup

1. Deploy your Convex app: `npm run convex:deploy`
2. Configure webhook in Semble:
   - URL: `https://your-deployment.convex.site/webhooks/semble`
   - Events: `patient.created`, `patient.updated`, `appointment.*`
   - Secret: Generate and save to `SEMBLE_WEBHOOK_SECRET`

## Database Schema

| Table | Purpose |
|-------|---------|
| `semblePatients` | Cached patient data from Semble |
| `sembleAppointments` | Cached appointment data |
| `sembleWebhookEvents` | Webhook event audit trail |
| `questionnaireSubmissions` | Questionnaire responses |

## API Reference

### Semble Actions

| Action | Description |
|--------|-------------|
| `semble:getPatient` | Fetch single patient |
| `semble:listPatients` | List patients (paginated) |
| `semble:searchPatients` | Search by name/email |
| `semble:getAppointment` | Fetch single appointment |
| `semble:listAppointments` | Filter appointments |
| `semble:syncPatients` | Bulk sync to local cache |
| `semble:submitQuestionnaire` | Submit to Semble |

### HTTP Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/webhooks/semble` | POST | Semble webhook receiver |
| `/health` | GET | Health check |

## Resources

- [Semble API Docs](https://docs.semble.io/)
- [Convex Docs](https://docs.convex.dev/)
- [Convex Auth](https://labs.convex.dev/auth)

## License

MIT
