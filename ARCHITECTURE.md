# Architecture Overview

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Rendered Fits Platform                   │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│                  │         │                  │
│   Customer Web   │         │   Merchant       │
│   (E-commerce)   │         │   Dashboard      │
│                  │         │   (Admin Panel)  │
└────────┬─────────┘         └────────┬─────────┘
         │                            │
         │                            │
    ┌────▼────┐                  ┌────▼────┐
    │ Widget  │                  │Dashboard│
    │(React)  │                  │ (React) │
    └────┬────┘                  └────┬────┘
         │                            │
         │         API Key            │   JWT Token
         └──────────┬─────────────────┘
                    │
              ┌─────▼─────┐
              │           │
              │    API    │
              │ (Express) │
              │           │
              └─────┬─────┘
                    │
         ┌──────────┼──────────┐
         │          │          │
    ┌────▼────┐ ┌──▼───┐ ┌────▼────┐
    │Postgres │ │Gemini│ │   S3    │
    │   DB    │ │ API  │ │(Future) │
    └─────────┘ └──────┘ └─────────┘
```

## Package Structure

### 1. Widget (`packages/widget`)

**Purpose**: Embeddable React component for e-commerce sites

**Key Files**:
- `src/main.tsx` - Widget initialization
- `src/App.tsx` - Main UI component
- `vite.config.ts` - Build as UMD library

**Features**:
- Image upload for person and garment
- Try-on processing
- Result display
- Embeddable in any website

### 2. Dashboard (`packages/dashboard`)

**Purpose**: Merchant admin interface

**Key Files**:
- `src/App.tsx` - Main app with routing
- `src/pages/Dashboard.tsx` - Stats overview
- `src/pages/ApiKeys.tsx` - API key management
- `src/pages/Analytics.tsx` - Analytics (coming soon)

**Features**:
- User authentication
- API key management
- Usage analytics
- Account settings

### 3. API (`packages/api`)

**Purpose**: Backend REST API

**Key Files**:
- `src/index.ts` - Express server setup
- `src/routes/` - API route definitions
- `src/controllers/` - Business logic
- `src/middleware/auth.ts` - Authentication
- `prisma/schema.prisma` - Database schema

**Endpoints**:
- `/api/try-on` - Process try-on requests
- `/api/auth/*` - User authentication
- `/api/api-keys/*` - API key management

### 4. Shared (`packages/shared`)

**Purpose**: Common types and utilities

**Key Files**:
- `src/types.ts` - TypeScript interfaces
- `src/utils.ts` - Helper functions
- `src/index.ts` - Package exports

**Usage**: Imported by all other packages for type safety

## Data Flow

### Try-On Request Flow

```
1. Customer uploads images in Widget
2. Widget sends POST to /api/try-on with API key
3. API validates API key
4. API uploads images to storage
5. API calls Gemini AI for processing
6. AI returns generated image
7. API saves result and returns URL
8. Widget displays result to customer
```

### Authentication Flow

```
Merchant Dashboard:
1. User enters email/password
2. Dashboard sends POST to /api/auth/login
3. API validates credentials
4. API returns JWT token
5. Dashboard stores token
6. Dashboard includes token in subsequent requests

Widget:
1. Merchant embeds widget with API key
2. Widget includes API key in headers
3. API validates key against database
4. API processes request if valid
```

## Database Schema

```sql
┌─────────────┐
│    User     │
├─────────────┤
│ id          │──┐
│ email       │  │
│ name        │  │
│ password    │  │
│ createdAt   │  │
└─────────────┘  │
                 │
         ┌───────┴────────┐
         │                │
    ┌────▼──────┐    ┌────▼──────┐
    │  ApiKey   │    │   TryOn   │
    ├───────────┤    ├───────────┤
    │ id        │──┐ │ id        │
    │ name      │  │ │ personUrl │
    │ key       │  │ │ garmentUrl│
    │ userId    │  └─┤ apiKeyId  │
    │ isActive  │    │ resultUrl │
    │ createdAt │    │ time      │
    └───────────┘    │ createdAt │
                     └───────────┘
```

## Technology Stack

### Frontend
- **React 18**: UI framework
- **Vite**: Build tool and dev server
- **TypeScript**: Type safety
- **React Router**: Navigation (dashboard)

### Backend
- **Node.js**: Runtime
- **Express**: Web framework
- **Prisma**: ORM for database
- **JWT**: Authentication
- **Multer**: File upload handling

### Database
- **PostgreSQL**: Primary database
- **Prisma Migrate**: Schema migrations

### AI/ML
- **Google Gemini 2.5 Flash**: AI image generation

### DevOps
- **Docker Compose**: Local PostgreSQL
- **npm Workspaces**: Monorepo management
- **ESLint + Prettier**: Code quality

## Security Considerations

### API Keys
- Generated with crypto.randomBytes
- Prefixed with 'rfts_' for identification
- Validated on every widget request
- Can be revoked by merchants

### JWT Tokens
- 7-day expiration
- Stored in localStorage (dashboard)
- Validated on protected routes
- Uses HS256 algorithm

### File Uploads
- Max size: 10MB
- Allowed types: JPEG, PNG, WebP
- Stored temporarily for processing
- Production: Move to S3 with signed URLs

### CORS
- Configurable allowed origins
- Credentials support
- Pre-flight request handling

## Deployment Strategy

### Development
```
Local machine with:
- Docker (PostgreSQL)
- Node.js dev servers
- Hot reload enabled
```

### Production

**API**:
- Deploy to: Railway, Render, or AWS
- Environment: Node.js 18+
- Database: Managed PostgreSQL
- Storage: AWS S3

**Dashboard**:
- Deploy to: Vercel, Netlify
- Build: Static SPA
- CDN: Automatic

**Widget**:
- Build: UMD bundle
- Deploy to: CDN (Cloudflare, AWS CloudFront)
- Version: Semantic versioning

## Performance Considerations

### Widget
- Lazy load images
- Optimize bundle size
- Cache API responses
- Compress images before upload

### API
- Implement rate limiting
- Cache frequent queries
- Use connection pooling
- Async processing for AI calls

### Database
- Index on apiKeyId, userId, createdAt
- Implement pagination
- Regular vacuum/analyze
- Monitor query performance

## Future Enhancements

1. **Batch Processing**: Process multiple try-ons in parallel
2. **Webhooks**: Notify merchants of events
3. **Analytics Dashboard**: Detailed usage metrics
4. **A/B Testing**: Test different AI models
5. **Mobile SDK**: Native iOS/Android widgets
6. **Video Try-On**: Support for video input
7. **3D Models**: Integration with 3D garment models
8. **CDN Integration**: Serve assets from edge locations

## Monitoring & Observability

**Metrics to Track**:
- API response times
- Try-on success rate
- Error rates by endpoint
- Database query performance
- AI processing time

**Logging**:
- Structured JSON logs
- Error tracking (Sentry)
- Request/response logging
- Performance profiling

**Alerts**:
- API downtime
- High error rates
- Database connection issues
- Storage quota exceeded
