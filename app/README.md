# APME Implicare Automation App

A modern web application for managing email automation based on Fillout form submissions. Replaces the Google Apps Script automation with a proper web dashboard, template management system, and PostgreSQL database.

## Features

- **Fillout Webhook Integration**: Real-time ingestion of form submissions with signature verification
- **Submissions Dashboard**: View, filter, and manage all form submissions
- **Template Management**: WYSIWYG editor for email templates with versioning and variants
- **Assignment Engine**: Automatic template assignment based on submission data
- **Audit Logging**: Track all changes to templates and system settings
- **Docker Swarm Deployment**: Production-ready deployment on VPS

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Queue**: Redis (for future background jobs)
- **UI**: Tailwind CSS + Radix UI
- **Testing**: Vitest
- **Deployment**: Docker Swarm via vps-infra

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL 16+ (local or Docker)

### Installation

1. Install dependencies:

```bash
pnpm install
```

2. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your values
```

3. Set up the database:

```bash
npx prisma migrate dev
npx prisma generate
```

4. Run the development server:

```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/apme_implicare?schema=public"

# Fillout
FILLOUT_API_KEY="your-fillout-api-key"
FILLOUT_WEBHOOK_SECRET="your-webhook-secret"

# Authentication
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# App
APP_URL="http://localhost:3000"
NODE_ENV="development"
```

## Database Schema

The schema includes:

- **Users**: Admin accounts with role-based access
- **Submissions**: Form submissions from Fillout
- **Templates**: Email templates with versioning
- **Assignments**: Template assignments for submissions
- **Webhook Events**: Audit log of webhook deliveries
- **Legacy Email History**: Imported historical data

## API Routes

### Webhooks

- `POST /api/webhooks/fillout` - Receive Fillout webhooks

### Submissions

- `GET /api/submissions` - List submissions (with pagination)
- `GET /api/submissions/:id` - Get single submission

### Templates

- `GET /api/templates` - List templates
- `POST /api/templates` - Create template
- `GET /api/templates/:id` - Get template
- `PATCH /api/templates/:id` - Update template
- `DELETE /api/templates/:id` - Delete template
- `POST /api/templates/:id/versions` - Create version
- `POST /api/templates/:id/publish` - Publish version

### Health

- `GET /api/health` - Health check endpoint

## Testing

Run tests:

```bash
pnpm test
```

Run tests with coverage:

```bash
pnpm test:coverage
```

## Deployment

### Build Docker Image

```bash
# Build for production
docker buildx build --platform linux/amd64 -t ghcr.io/daniifrim/apme-implicare-web:latest .

# Push to registry
docker push ghcr.io/daniifrim/apme-implicare-web:latest
```

### Deploy to VPS

1. Copy stack file to VPS:

```bash
cp docker-compose.yml /path/to/vps-infra/stacks/apme-implicare/
```

2. Set up environment on VPS:

```bash
# Copy real .env to VPS
scp .env root@88.198.218.71:/opt/stacks/apme-implicare/
```

3. Deploy with Docker Swarm:

```bash
docker --context hetzner stack deploy -c /opt/stacks/apme-implicare/compose.yml apme-implicare
```

### Database Migrations

After deployment, run migrations:

```bash
docker --context hetzner exec $(docker --context hetzner ps -q -f name=apme-implicare_web) npx prisma migrate deploy
```

## Project Structure

```
app/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API routes
│   │   ├── dashboard/      # Dashboard pages
│   │   └── ...
│   ├── components/         # React components
│   ├── lib/               # Utilities and logic
│   │   ├── prisma.ts      # Database client
│   │   ├── webhook.ts     # Webhook utilities
│   │   ├── normalize.ts   # Data normalization
│   │   └── assignment-engine.ts  # Template assignment
│   ├── types/             # TypeScript types
│   └── test/              # Test setup
├── prisma/
│   └── schema.prisma      # Database schema
├── Dockerfile             # Production build
├── docker-compose.yml     # Local development
└── vitest.config.ts       # Test configuration
```

## Migration from Apps Script

The system is designed to run in parallel with the existing Apps Script during transition:

1. **Phase 1**: Import legacy CSV data
2. **Phase 2**: Run in shadow mode (ingest but don't send)
3. **Phase 3**: Switch over when email sending is implemented

## Security

- Webhook signatures verified with HMAC-SHA256
- No secrets committed to git
- Environment variables for sensitive data
- Role-based access control (planned)

## License

Private - APME (Association for Missions and Evangelism)
