# Rendered Fits

An AI-powered virtual try-on platform for fashion e-commerce. Enable your customers to visualize how clothing looks on them before making a purchase.

## Features

- **Virtual Try-On Widget**: Embeddable widget for e-commerce sites
- **Merchant Dashboard**: Admin panel for managing API keys and analytics
- **AI-Powered**: Uses Google Gemini 2.5 Flash API for image generation
- **RESTful API**: Backend API with authentication and rate limiting
- **Type-Safe**: Full TypeScript support across all packages

## Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **AI**: Google Gemini 2.5 Flash API
- **Auth**: JWT tokens
- **Storage**: Local filesystem (S3 ready for production)

## Project Structure

```
rendered-fits/
├── packages/
│   ├── widget/          # Customer-facing try-on widget
│   ├── dashboard/       # Merchant admin dashboard
│   ├── api/            # Backend API
│   └── shared/         # Shared types/utils
├── docker-compose.yml   # Local development
└── README.md
```

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker and Docker Compose (for PostgreSQL)
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd rendered-fits
```

### 2. Install Dependencies

```bash
npm install
```

This will install dependencies for all packages in the monorepo.

### 3. Set Up Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
cp packages/api/.env.example packages/api/.env
```

Edit `packages/api/.env` and add your configuration:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/rendered_fits"
JWT_SECRET="your-secure-random-string"
GEMINI_API_KEY="your-gemini-api-key"
PORT=3001
NODE_ENV=development
```

### 4. Start PostgreSQL

```bash
npm run docker:up
```

This starts a PostgreSQL container using Docker Compose.

### 5. Run Database Migrations

```bash
npm run db:generate
npm run db:migrate
```

This creates the database schema using Prisma.

### 6. Start Development Servers

In separate terminals, run:

```bash
# Terminal 1: Start API server
cd packages/api
npm run dev

# Terminal 2: Start Dashboard
cd packages/dashboard
npm run dev

# Terminal 3: Start Widget (optional)
cd packages/widget
npm run dev
```

The services will be available at:
- API: http://localhost:3001
- Dashboard: http://localhost:3000
- Widget: http://localhost:5173

## Package Scripts

### Root Commands

```bash
npm run dev              # Start all packages in development mode
npm run build            # Build all packages
npm run lint             # Lint all packages
npm run format           # Format code with Prettier
npm run format:check     # Check code formatting
npm run typecheck        # Run TypeScript type checking
npm run clean            # Clean all node_modules

# Docker commands
npm run docker:up        # Start PostgreSQL container
npm run docker:down      # Stop PostgreSQL container
npm run docker:logs      # View PostgreSQL logs

# Database commands
npm run db:migrate       # Run Prisma migrations
npm run db:generate      # Generate Prisma client
npm run db:studio        # Open Prisma Studio (database GUI)
```

### Package-Specific Commands

#### API (`packages/api`)

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Run production build
npm run db:migrate       # Run migrations
npm run db:generate      # Generate Prisma client
npm run db:studio        # Open Prisma Studio
```

#### Dashboard (`packages/dashboard`)

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run preview          # Preview production build
```

#### Widget (`packages/widget`)

```bash
npm run dev              # Start development server
npm run build            # Build for production (as library)
npm run preview          # Preview production build
```

## Using the Widget

### Embedding in Your Site

1. Include the widget script:

```html
<script src="https://your-cdn.com/rendered-fits-widget.umd.js"></script>
```

2. Add a container element:

```html
<div id="rendered-fits-widget"></div>
```

3. Initialize the widget:

```javascript
<script>
  window.initRenderedFitsWidget({
    containerId: 'rendered-fits-widget',
    apiKey: 'rfts_your_api_key',
    apiUrl: 'https://api.your-domain.com' // optional
  })
</script>
```

## API Documentation

### Authentication

Use JWT tokens for merchant dashboard authentication:

```bash
POST /api/auth/register
POST /api/auth/login
```

Use API keys for widget authentication:

```bash
Header: X-API-Key: rfts_your_api_key
```

### Endpoints

#### Try-On

```bash
POST /api/try-on
Headers:
  X-API-Key: your-api-key
Body (multipart/form-data):
  personImage: File
  garmentImage: File
Response:
  {
    "success": true,
    "resultUrl": "https://..."
  }
```

#### API Keys

```bash
GET /api/api-keys          # List API keys
POST /api/api-keys         # Create API key
DELETE /api/api-keys/:id   # Delete API key
```

## Database Schema

The database includes three main models:

- **User**: Merchant accounts
- **ApiKey**: API keys for widget authentication
- **TryOn**: Try-on event records for analytics

See [packages/api/prisma/schema.prisma](packages/api/prisma/schema.prisma) for the complete schema.

## Development Tips

### Prisma Studio

View and edit your database with a GUI:

```bash
npm run db:studio
```

### Hot Reload

All packages support hot reload in development mode. Changes to shared types will automatically trigger rebuilds in dependent packages.

### Type Safety

The `@rendered-fits/shared` package provides shared types used across all packages. Import types like this:

```typescript
import { User, ApiKey, TryOnRequest } from '@rendered-fits/shared'
```

## Production Deployment

### Building for Production

```bash
npm run build
```

### Environment Variables

Ensure these are set in production:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Strong random secret for JWT tokens
- `GEMINI_API_KEY`: Your Gemini API key
- `NODE_ENV=production`
- AWS credentials (if using S3)

### Database Migrations

Run migrations in production:

```bash
cd packages/api
npx prisma migrate deploy
```

### Deployment Platforms

- **API**: Deploy to any Node.js hosting (Vercel, Railway, Render, etc.)
- **Dashboard**: Deploy to Vercel, Netlify, or any static hosting
- **Widget**: Build and serve from CDN

## Roadmap

- [ ] Implement actual AI try-on with Gemini API
- [ ] Add AWS S3 integration for image storage
- [ ] Implement rate limiting
- [ ] Add webhook support
- [ ] Create analytics dashboard
- [ ] Add batch processing
- [ ] Implement caching layer
- [ ] Add monitoring and logging

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.

---

Built with by the Rendered Fits team
