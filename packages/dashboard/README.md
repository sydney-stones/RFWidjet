# Rendered Fits Dashboard

Merchant admin dashboard for managing virtual try-on analytics, products, and settings.

## Features

- **Analytics Overview** - Real-time try-on metrics and conversion data
- **Product Management** - View and manage product catalog
- **Widget Settings** - Copy integration code and API keys
- **Billing** - Monitor usage and manage subscription plans

## Tech Stack

- React 18 + TypeScript
- React Router for navigation
- TanStack Query for data fetching
- Tailwind CSS for styling
- Recharts for analytics graphs
- Lucide React for icons

## Development

```bash
npm install
npm run dev
```

## Login

Use your merchant API key to sign in. Get it from `/api/auth/register` endpoint.

## Pages

- `/login` - API key authentication
- `/overview` - Analytics dashboard
- `/products` - Product catalog
- `/settings` - Widget configuration
- `/billing` - Usage and billing

## Environment Variables

Create `.env`:

```
VITE_API_URL=http://localhost:3001
```
