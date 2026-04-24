#!/bin/bash

# =====================================================
# CleanOps AI - Commercial Cleaning Operations Platform
# Start Script with Auto-Reload
# =====================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║       CleanOps AI - Operations Platform               ║"
echo "║       AI-Powered Commercial Cleaning Management       ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ===== Kill processes on ports 3000 and 3001 =====
echo -e "${YELLOW}[1/6] Cleaning up used ports...${NC}"
for PORT in 3000 3001; do
  PID=$(lsof -ti:$PORT 2>/dev/null || true)
  if [ -n "$PID" ]; then
    echo -e "  Killing process on port $PORT (PID: $PID)"
    kill -9 $PID 2>/dev/null || true
    sleep 1
  fi
done
echo -e "${GREEN}  ✓ Ports 3000, 3001 are free${NC}"

# ===== Check PostgreSQL =====
echo -e "\n${YELLOW}[2/6] Checking PostgreSQL...${NC}"
if ! command -v psql &> /dev/null; then
  echo -e "${RED}  ✗ PostgreSQL is not installed. Please install it first.${NC}"
  exit 1
fi

if ! pg_isready -q 2>/dev/null; then
  echo -e "${YELLOW}  Starting PostgreSQL...${NC}"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null || true
  else
    sudo systemctl start postgresql 2>/dev/null || true
  fi
  sleep 2
fi

if pg_isready -q 2>/dev/null; then
  echo -e "${GREEN}  ✓ PostgreSQL is running${NC}"
else
  echo -e "${RED}  ✗ PostgreSQL failed to start${NC}"
  exit 1
fi

# ===== Create Database =====
echo -e "\n${YELLOW}[3/6] Setting up database...${NC}"
DB_NAME="cleaning_ops"
if psql -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
  echo -e "${GREEN}  ✓ Database '$DB_NAME' exists${NC}"
else
  createdb "$DB_NAME" 2>/dev/null && echo -e "${GREEN}  ✓ Database '$DB_NAME' created${NC}" || echo -e "${YELLOW}  Database may already exist${NC}"
fi

# ===== Install Dependencies =====
echo -e "\n${YELLOW}[4/6] Installing dependencies...${NC}"
cd "$PROJECT_DIR/backend"
if [ ! -d "node_modules" ]; then
  echo -e "  Installing backend dependencies..."
  npm install --silent 2>&1 | tail -1
else
  echo -e "  Backend dependencies already installed"
fi

cd "$PROJECT_DIR/frontend"
if [ ! -d "node_modules" ]; then
  echo -e "  Installing frontend dependencies..."
  npm install --silent 2>&1 | tail -1
else
  echo -e "  Frontend dependencies already installed"
fi
echo -e "${GREEN}  ✓ Dependencies installed${NC}"

# ===== Seed Database =====
echo -e "\n${YELLOW}[5/6] Seeding database...${NC}"
cd "$PROJECT_DIR/backend"
node seeds/seed.js
echo -e "${GREEN}  ✓ Database seeded with sample data${NC}"

# ===== Start Servers =====
echo -e "\n${YELLOW}[6/6] Starting servers with hot-reload...${NC}"

# Start backend with nodemon for auto-reload
cd "$PROJECT_DIR/backend"
npx nodemon server.js &
BACKEND_PID=$!
echo -e "${GREEN}  ✓ Backend starting on port 3001 (with auto-reload)${NC}"

# Start frontend (React dev server has hot-reload built in)
cd "$PROJECT_DIR/frontend"
BROWSER=none PORT=3000 npm start &
FRONTEND_PID=$!
echo -e "${GREEN}  ✓ Frontend starting on port 3000 (with hot-reload)${NC}"

sleep 3

echo -e "\n${CYAN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║  ${GREEN}Application is running!${CYAN}                              ║${NC}"
echo -e "${CYAN}║                                                       ║${NC}"
echo -e "${CYAN}║  ${NC}Frontend:  ${BLUE}http://localhost:3000${CYAN}                    ║${NC}"
echo -e "${CYAN}║  ${NC}Backend:   ${BLUE}http://localhost:3001${CYAN}                    ║${NC}"
echo -e "${CYAN}║  ${NC}API Docs:  ${BLUE}http://localhost:3001/api/health${CYAN}         ║${NC}"
echo -e "${CYAN}║                                                       ║${NC}"
echo -e "${CYAN}║  ${PURPLE}Login: admin@cleanops.com / password123${CYAN}              ║${NC}"
echo -e "${CYAN}║                                                       ║${NC}"
echo -e "${CYAN}║  ${YELLOW}Both servers reload automatically on code changes${CYAN}   ║${NC}"
echo -e "${CYAN}║  ${NC}Press Ctrl+C to stop all servers${CYAN}                    ║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════╝${NC}"

# Cleanup on exit
cleanup() {
  echo -e "\n${YELLOW}Shutting down servers...${NC}"
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  echo -e "${GREEN}Servers stopped. Goodbye!${NC}"
  exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for background processes
wait
