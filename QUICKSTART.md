# Quick Start Guide

Get Rendered Fits up and running in 5 minutes.

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Configure Environment

```bash
# Copy environment template
cp packages/api/.env.example packages/api/.env

# Edit the file and add your Gemini API key
# Get one at: https://makersuite.google.com/app/apikey
```

Edit `packages/api/.env`:
```env
GEMINI_API_KEY="your-actual-api-key-here"
```

## Step 3: Start PostgreSQL

```bash
npm run docker:up
```

Wait for the database to be ready (about 10 seconds).

## Step 4: Initialize Database

```bash
npm run db:generate
npm run db:migrate
```

## Step 5: Start Development Servers

### Option A: All Services (Recommended)

Open three terminal windows:

**Terminal 1 - API:**
```bash
cd packages/api
npm run dev
```

**Terminal 2 - Dashboard:**
```bash
cd packages/dashboard
npm run dev
```

**Terminal 3 - Widget (Optional):**
```bash
cd packages/widget
npm run dev
```

### Option B: Just the API

If you only want to test the API:

```bash
cd packages/api
npm run dev
```

## Step 6: Test the Setup

### Test the API

```bash
curl http://localhost:3001/health
```

Should return: `{"status":"ok","timestamp":"..."}`

### Test the Dashboard

Open your browser to: http://localhost:3000

You should see the Rendered Fits dashboard.

### Test the Widget

Open your browser to: http://localhost:5173

You should see the virtual try-on widget interface.

## Common Issues

### Port Already in Use

If port 5432, 3001, 3000, or 5173 is already in use, you can change it:

- PostgreSQL: Edit `docker-compose.yml`
- API: Edit `packages/api/.env` (PORT=3001)
- Dashboard: Edit `packages/dashboard/vite.config.ts`
- Widget: Edit `packages/widget/vite.config.ts`

### Database Connection Failed

Make sure Docker is running and PostgreSQL container is healthy:

```bash
docker ps
```

You should see `rendered-fits-db` with status "healthy".

### Module Not Found Errors

Try cleaning and reinstalling:

```bash
npm run clean
npm install
```

## Next Steps

1. **Create an API Key**: Use the dashboard to create an API key
2. **Test Try-On**: Use the widget to upload images and test the try-on feature
3. **Explore the Code**: Check out the packages to understand the architecture
4. **Read the README**: See [README.md](README.md) for detailed documentation

## Development Workflow

1. Make changes to code
2. Hot reload will automatically update (for most changes)
3. For schema changes, run `npm run db:migrate`
4. Commit your changes

## Stop Everything

```bash
# Stop Docker
npm run docker:down

# Stop dev servers: Press Ctrl+C in each terminal
```

## Need Help?

- Check the main [README.md](README.md)
- Review the code in `packages/`
- Open an issue on GitHub

Happy coding!
