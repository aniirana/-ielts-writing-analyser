#!/bin/bash

# ── Colors ────────────────────────────────────────────────────
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# ── Add Node to PATH ──────────────────────────────────────────
export PATH="/usr/local/bin:$PATH"

echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}   IELTS Writing Analyser — Starting...${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# ── Check Node is available ───────────────────────────────────
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js not found. Please install from https://nodejs.org${NC}"
  exit 1
fi

# ── Install dependencies if needed ───────────────────────────
if [ ! -d "node_modules" ]; then
  echo -e "${BLUE}📦 Installing dependencies...${NC}"
  npm install
fi

# ── Start backend in background ───────────────────────────────
echo -e "${GREEN}🚀 Starting backend on http://localhost:8080 ...${NC}"
node server.js &
BACKEND_PID=$!

# ── Wait for backend to be ready ─────────────────────────────
sleep 2

# ── Start frontend ────────────────────────────────────────────
echo -e "${GREEN}🎨 Starting frontend on http://localhost:5173 ...${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ App is running!${NC}"
echo -e "${GREEN}   Open: http://localhost:5173${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "Press ${RED}Ctrl+C${NC} to stop both servers"
echo ""

# ── Open browser automatically ────────────────────────────────
sleep 1
open http://localhost:5173

# ── Start frontend (blocking) ─────────────────────────────────
npm run dev

# ── When frontend stops, kill backend too ─────────────────────
kill $BACKEND_PID 2>/dev/null
echo ""
echo -e "${RED}👋 Both servers stopped.${NC}"