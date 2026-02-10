#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "=== Paracord Development Setup ==="
echo ""

# ── Prerequisite Checks ──────────────────────────────────────────────────────

MISSING=0

check_cmd() {
    if command -v "$1" >/dev/null 2>&1; then
        local ver
        ver=$("$1" --version 2>/dev/null | head -n1 || echo "found")
        echo "  [OK] $1 ($ver)"
    else
        echo "  [MISSING] $1 - $2"
        MISSING=1
    fi
}

echo "Checking prerequisites..."
check_cmd cargo   "Install from https://rustup.rs/"
check_cmd node    "Install from https://nodejs.org/ (v22+)"
check_cmd npm     "Comes with Node.js"
check_cmd docker  "Install from https://www.docker.com/ (optional, for Docker deployment)"
check_cmd psql    "Install PostgreSQL client tools (optional, for local dev)"
echo ""

if [ "$MISSING" -eq 1 ]; then
    echo "WARNING: Some optional tools are missing. Core tools (cargo, node) are required."
    if ! command -v cargo >/dev/null 2>&1 || ! command -v node >/dev/null 2>&1; then
        echo "ERROR: cargo and node are required. Please install them and re-run."
        exit 1
    fi
fi

# ── Copy Config Template ─────────────────────────────────────────────────────

echo "Step 1: Configuration"
CONFIG_FILE="$PROJECT_ROOT/config/paracord.toml"
EXAMPLE_FILE="$PROJECT_ROOT/config/paracord.example.toml"

if [ -f "$CONFIG_FILE" ]; then
    echo "  Config already exists at config/paracord.toml (skipping)"
else
    if [ -f "$EXAMPLE_FILE" ]; then
        cp "$EXAMPLE_FILE" "$CONFIG_FILE"
        echo "  Copied config/paracord.example.toml -> config/paracord.toml"
        echo "  IMPORTANT: Edit config/paracord.toml and set a secure jwt_secret!"
    else
        echo "  WARNING: config/paracord.example.toml not found, skipping config copy"
    fi
fi
echo ""

# ── Create Data Directories ──────────────────────────────────────────────────

echo "Step 2: Data directories"
mkdir -p "$PROJECT_ROOT/data/uploads"
mkdir -p "$PROJECT_ROOT/data/files"
echo "  Created data/uploads and data/files"
echo ""

# ── Start Database (Docker) ──────────────────────────────────────────────────

echo "Step 3: Database"
if command -v docker >/dev/null 2>&1; then
    # Check if postgres container is already running
    if docker ps --format '{{.Names}}' 2>/dev/null | grep -q 'postgres'; then
        echo "  PostgreSQL container already running (skipping)"
    else
        echo "  Starting PostgreSQL via Docker Compose..."
        docker compose -f "$PROJECT_ROOT/docker/docker-compose.yml" up postgres -d
        echo "  Waiting for PostgreSQL to be healthy..."
        sleep 5
    fi
else
    echo "  Docker not found. Please start PostgreSQL manually."
    echo "  Connection string: postgres://paracord:paracord@localhost:5432/paracord"
fi
echo ""

# ── Run Database Migrations ──────────────────────────────────────────────────

echo "Step 4: Database migrations"
if command -v psql >/dev/null 2>&1; then
    MIGRATIONS_DIR="$PROJECT_ROOT/crates/paracord-db/migrations"
    if [ -d "$MIGRATIONS_DIR" ]; then
        export PGPASSWORD=paracord
        for migration in "$MIGRATIONS_DIR"/*.sql; do
            if [ -f "$migration" ]; then
                BASENAME="$(basename "$migration")"
                echo "  Running migration: $BASENAME"
                psql -h localhost -U paracord -d paracord -f "$migration" 2>/dev/null || \
                    echo "    (migration may have already been applied)"
            fi
        done
        unset PGPASSWORD
    else
        echo "  No migrations directory found at crates/paracord-db/migrations/"
        echo "  SQLx will run migrations at server startup if configured."
    fi
else
    echo "  psql not found, skipping manual migrations."
    echo "  SQLx will run migrations at server startup if configured."
fi
echo ""

# ── Install Client Dependencies ──────────────────────────────────────────────

echo "Step 5: Client dependencies"
if [ -f "$PROJECT_ROOT/client/package.json" ]; then
    cd "$PROJECT_ROOT/client"
    npm install
    echo "  Client dependencies installed"
    cd "$PROJECT_ROOT"
else
    echo "  No client/package.json found (skipping)"
fi
echo ""

# ── Build Rust Workspace ─────────────────────────────────────────────────────

echo "Step 6: Building Rust workspace"
cd "$PROJECT_ROOT"
cargo build
echo "  Rust workspace built successfully"
echo ""

# ── Done ─────────────────────────────────────────────────────────────────────

echo "=== Setup Complete! ==="
echo ""
echo "To run the server:"
echo "  cargo run --bin paracord-server"
echo ""
echo "To run the client (in another terminal):"
echo "  cd client && npm run dev"
echo ""
echo "To run everything with Docker:"
echo "  docker compose -f docker/docker-compose.yml up -d"
echo ""
