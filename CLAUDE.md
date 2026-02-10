# Paracord

## Project Overview
Paracord is a decentralized, self-hostable Discord alternative built with Rust + Tauri + React. The project name "Paracord" is a placeholder and can be changed.

## Architecture
- **Server**: Rust monorepo with 9 crates under `crates/`
  - `paracord-server` - binary entry point (axum)
  - `paracord-api` - REST API handlers
  - `paracord-ws` - WebSocket gateway
  - `paracord-core` - business logic + event bus
  - `paracord-db` - SQLite via SQLx
  - `paracord-federation` - Matrix protocol (Phase 6)
  - `paracord-models` - shared types
  - `paracord-media` - file storage + LiveKit
  - `paracord-util` - snowflake IDs, validation
- **Client**: Tauri v2 desktop app under `client/`
  - React 19 + TypeScript + Vite 6 + Tailwind CSS v4
  - Zustand v5 for state management
  - React Router v7 for routing

## Commands
- `cargo check --workspace --no-default-features` - check Rust server (without embedded UI)
- `cd client && npm install && npm run build` - build client web UI
- `cargo build --release --bin paracord-server` - build server with embedded UI (requires client/dist/)
- `cargo run --bin paracord-server --no-default-features` - run server in dev mode (use with Vite dev proxy)
- `cd client && npm run dev` - run client dev server (proxies API/WS to localhost:8090)
- `./target/release/paracord-server` - run release server (auto-generates config, embeds web UI)

## Code Style
- Rust: default rustfmt, edition 2021
- TypeScript: strict mode, React 19 patterns
- Use Snowflake IDs (i64) for all entity primary keys
- CSS custom properties for theming (Discord-like dark theme)
