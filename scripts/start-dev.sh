#!/bin/bash

# Rendered Fits - Development Startup Script

set -e

echo "🚀 Starting Rendered Fits Development Environment"
echo "=================================================="

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your actual credentials!"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

echo "🐳 Starting Docker containers..."
docker-compose up -d postgres redis

echo "⏳ Waiting for PostgreSQL to be ready..."
until docker-compose exec -T postgres pg_isready -U renderedfits > /dev/null 2>&1; do
    sleep 1
done

echo "✅ PostgreSQL is ready"

echo "🗄️  Running database migrations..."
npm run migrate:dev --workspace=packages/api

echo "🌱 Seeding database (optional)..."
npm run seed --workspace=packages/api || true

echo ""
echo "✅ Development environment is ready!"
echo ""
echo "📍 Services:"
echo "   - API:       http://localhost:3001"
echo "   - Dashboard: http://localhost:5173"
echo "   - Widget:    http://localhost:8081"
echo "   - Postgres:  localhost:5432"
echo "   - Redis:     localhost:6379"
echo ""
echo "🔧 To start development servers:"
echo "   npm run dev"
echo ""
echo "📊 To view database:"
echo "   npm run studio --workspace=packages/api"
echo ""
echo "🛑 To stop all services:"
echo "   docker-compose down"
echo ""
