# Paracord API and Gateway Contracts (v1)

This document defines the baseline contracts for Paracord server and clients.

## Resource Shapes

### Channel

- `id`: string snowflake
- `guild_id`: string or null
- `type`: number (`channel_type` is also sent for compatibility)
- `name`: string or null
- `position`: number
- `parent_id`: string or null

### Message

- `id`: string snowflake
- `channel_id`: string
- `author`: `{ id, username, discriminator, avatar_hash }`
- `content`: string or null
- `type`: number (`message_type` is also sent for compatibility)
- `timestamp`: ISO-8601 string (`created_at` also sent)
- `edited_timestamp`: ISO-8601 string or null (`edited_at` also sent)
- `reference_id`: string or null
- `attachments`: list of attachment objects
- `reactions`: list of reaction aggregates (`emoji`, `count`, `me`)

### DM Channel

- `id`: string snowflake
- `type`: `1`
- `recipient`: `{ id, username, discriminator, avatar_hash }`
- `last_message_id`: string or null

### Read State

- `channel_id`: string
- `last_message_id`: string
- `mention_count`: number

## REST Endpoints (v1)

### Auth

- `POST /api/v1/auth/register`
  - body: `{ email, username, password, display_name? }`
- `POST /api/v1/auth/login`

### Users

- `GET /api/v1/users/@me`
- `PATCH /api/v1/users/@me`
- `GET /api/v1/users/@me/settings`
- `PATCH /api/v1/users/@me/settings`
- `GET /api/v1/users/@me/guilds`
- `GET /api/v1/users/@me/dms`
- `POST /api/v1/users/@me/dms`
- `GET /api/v1/users/@me/read-states`
- `GET /api/v1/users/@me/relationships`
- `POST /api/v1/users/@me/relationships`
- `DELETE /api/v1/users/@me/relationships/{user_id}`

### Guilds

- `POST /api/v1/guilds`
- `GET /api/v1/guilds/{guild_id}`
- `PATCH /api/v1/guilds/{guild_id}`
- `DELETE /api/v1/guilds/{guild_id}`
- `POST /api/v1/guilds/{guild_id}/owner`
- `GET /api/v1/guilds/{guild_id}/channels`
- `POST /api/v1/guilds/{guild_id}/channels`
- `GET /api/v1/guilds/{guild_id}/members`
- `PATCH /api/v1/guilds/{guild_id}/members/{user_id}`
- `DELETE /api/v1/guilds/{guild_id}/members/{user_id}`
- `DELETE /api/v1/guilds/{guild_id}/members/@me`
- `GET /api/v1/guilds/{guild_id}/roles`
- `POST /api/v1/guilds/{guild_id}/roles`
- `PATCH /api/v1/guilds/{guild_id}/roles/{role_id}`
- `DELETE /api/v1/guilds/{guild_id}/roles/{role_id}`
- `GET /api/v1/guilds/{guild_id}/bans`
- `PUT /api/v1/guilds/{guild_id}/bans/{user_id}`
- `DELETE /api/v1/guilds/{guild_id}/bans/{user_id}`
- `GET /api/v1/guilds/{guild_id}/invites`
- `GET /api/v1/guilds/{guild_id}/audit-logs`

### Channels

- `GET /api/v1/channels/{channel_id}`
- `PATCH /api/v1/channels/{channel_id}`
- `DELETE /api/v1/channels/{channel_id}`
- `GET /api/v1/channels/{channel_id}/messages`
- `POST /api/v1/channels/{channel_id}/messages`
- `POST /api/v1/channels/{channel_id}/messages/bulk-delete`
- `GET /api/v1/channels/{channel_id}/messages/search`
- `PATCH /api/v1/channels/{channel_id}/messages/{message_id}`
- `DELETE /api/v1/channels/{channel_id}/messages/{message_id}`
- `GET /api/v1/channels/{channel_id}/pins`
- `PUT /api/v1/channels/{channel_id}/pins/{message_id}`
- `DELETE /api/v1/channels/{channel_id}/pins/{message_id}`
- `POST /api/v1/channels/{channel_id}/typing`
- `PUT /api/v1/channels/{channel_id}/read`
- `GET /api/v1/channels/{channel_id}/overwrites`
- `PUT /api/v1/channels/{channel_id}/overwrites/{target_id}`
- `DELETE /api/v1/channels/{channel_id}/overwrites/{target_id}`
- `PUT /api/v1/channels/{channel_id}/messages/{message_id}/reactions/{emoji}/@me`
- `DELETE /api/v1/channels/{channel_id}/messages/{message_id}/reactions/{emoji}/@me`

### Invites

- `POST /api/v1/channels/{channel_id}/invites`
- `GET /api/v1/invites/{code}`
- `POST /api/v1/invites/{code}`
- `DELETE /api/v1/invites/{code}`

### Voice and Streaming

- `GET /api/v1/voice/{channel_id}/join`
- `POST /api/v1/voice/{channel_id}/leave`
- `POST /api/v1/voice/{channel_id}/stream`

### Attachments

1. Upload through `POST /api/v1/channels/{channel_id}/attachments`.
2. Send message through `POST /api/v1/channels/{channel_id}/messages` with `attachment_ids`.
3. Download bytes through `GET /api/v1/attachments/{id}` (authorized and channel-scoped).

Pending uploads are stored with `message_id = NULL` until linked during message creation.

## Invite Accept Contract

`POST /api/v1/invites/{code}` returns a guild object directly (not nested), plus:

- `default_channel_id`: first usable channel for post-join navigation.

## Gateway Contracts

### Opcodes (client -> server)

- `1`: HEARTBEAT
- `2`: IDENTIFY
- `3`: PRESENCE_UPDATE
- `4`: VOICE_STATE_UPDATE
- `6`: RESUME
- `9`: TYPING_START

### Opcodes (server -> client)

- `0`: DISPATCH
- `7`: RECONNECT
- `9`: INVALID_SESSION
- `10`: HELLO
- `11`: HEARTBEAT_ACK

### Core Dispatch Events

- `READY`
- `RESUMED`
- `GUILD_CREATE` / `GUILD_UPDATE` / `GUILD_DELETE`
- `CHANNEL_CREATE` / `CHANNEL_UPDATE` / `CHANNEL_DELETE`
- `GUILD_MEMBER_ADD` / `GUILD_MEMBER_UPDATE` / `GUILD_MEMBER_REMOVE`
- `MESSAGE_CREATE` / `MESSAGE_UPDATE` / `MESSAGE_DELETE` / `MESSAGE_DELETE_BULK`
- `MESSAGE_REACTION_ADD` / `MESSAGE_REACTION_REMOVE`
- `CHANNEL_PINS_UPDATE`
- `PRESENCE_UPDATE`
- `TYPING_START`
- `VOICE_STATE_UPDATE`
- `GUILD_ROLE_CREATE` / `GUILD_ROLE_UPDATE` / `GUILD_ROLE_DELETE`
- `GUILD_BAN_ADD` / `GUILD_BAN_REMOVE`
- `INVITE_CREATE` / `INVITE_DELETE`
