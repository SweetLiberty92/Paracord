use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    Json,
};
use paracord_core::AppState;
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;

use crate::error::ApiError;
use crate::middleware::AdminUser;

// ── Stats ───────────────────────────────────────────────────────────────

pub async fn get_stats(
    State(state): State<AppState>,
    _admin: AdminUser,
) -> Result<Json<Value>, ApiError> {
    let stats = paracord_core::admin::get_server_stats(&state.db).await?;
    Ok(Json(json!({
        "total_users": stats.total_users,
        "total_guilds": stats.total_guilds,
        "total_messages": stats.total_messages,
        "total_channels": stats.total_channels,
    })))
}

// ── Settings ────────────────────────────────────────────────────────────

pub async fn get_settings(
    State(state): State<AppState>,
    _admin: AdminUser,
) -> Result<Json<Value>, ApiError> {
    let settings = state.runtime.read().await;
    Ok(Json(json!({
        "registration_enabled": settings.registration_enabled.to_string(),
        "server_name": settings.server_name,
        "server_description": settings.server_description,
        "max_guilds_per_user": settings.max_guilds_per_user.to_string(),
        "max_members_per_guild": settings.max_members_per_guild.to_string(),
    })))
}

pub async fn update_settings(
    State(state): State<AppState>,
    _admin: AdminUser,
    Json(body): Json<HashMap<String, String>>,
) -> Result<Json<Value>, ApiError> {
    // Write each setting to DB
    for (key, value) in &body {
        paracord_db::server_settings::set_setting(&state.db, key, value)
            .await
            .map_err(|e| ApiError::Internal(anyhow::anyhow!(e.to_string())))?;
    }

    // Update in-memory runtime settings
    let mut settings = state.runtime.write().await;
    for (key, value) in &body {
        match key.as_str() {
            "registration_enabled" => {
                settings.registration_enabled = value == "true";
            }
            "server_name" => {
                settings.server_name = value.clone();
            }
            "server_description" => {
                settings.server_description = value.clone();
            }
            "max_guilds_per_user" => {
                if let Ok(v) = value.parse() {
                    settings.max_guilds_per_user = v;
                }
            }
            "max_members_per_guild" => {
                if let Ok(v) = value.parse() {
                    settings.max_members_per_guild = v;
                }
            }
            _ => {}
        }
    }

    Ok(Json(json!({
        "registration_enabled": settings.registration_enabled.to_string(),
        "server_name": settings.server_name,
        "server_description": settings.server_description,
        "max_guilds_per_user": settings.max_guilds_per_user.to_string(),
        "max_members_per_guild": settings.max_members_per_guild.to_string(),
    })))
}

// ── Users ───────────────────────────────────────────────────────────────

#[derive(Deserialize)]
pub struct PaginationParams {
    pub offset: Option<i64>,
    pub limit: Option<i64>,
}

pub async fn list_users(
    State(state): State<AppState>,
    _admin: AdminUser,
    Query(params): Query<PaginationParams>,
) -> Result<Json<Value>, ApiError> {
    let offset = params.offset.unwrap_or(0);
    let limit = params.limit.unwrap_or(50).min(100);

    let users = paracord_db::users::list_users_paginated(&state.db, offset, limit)
        .await
        .map_err(|e| ApiError::Internal(anyhow::anyhow!(e.to_string())))?;

    let total = paracord_db::users::count_users(&state.db)
        .await
        .map_err(|e| ApiError::Internal(anyhow::anyhow!(e.to_string())))?;

    let user_list: Vec<Value> = users
        .into_iter()
        .map(|u| {
            json!({
                "id": u.id.to_string(),
                "username": u.username,
                "discriminator": u.discriminator,
                "email": u.email,
                "display_name": u.display_name,
                "avatar_hash": u.avatar_hash,
                "flags": u.flags,
                "created_at": u.created_at.to_rfc3339(),
            })
        })
        .collect();

    Ok(Json(json!({
        "users": user_list,
        "total": total,
        "offset": offset,
        "limit": limit,
    })))
}

#[derive(Deserialize)]
pub struct UpdateUserRequest {
    pub flags: Option<i32>,
}

pub async fn update_user(
    State(state): State<AppState>,
    admin: AdminUser,
    Path(user_id): Path<i64>,
    Json(body): Json<UpdateUserRequest>,
) -> Result<Json<Value>, ApiError> {
    if let Some(flags) = body.flags {
        // Prevent admin from removing their own admin flag
        if user_id == admin.user_id && !paracord_core::is_admin(flags) {
            return Err(ApiError::BadRequest(
                "Cannot remove your own admin status".into(),
            ));
        }

        let updated = paracord_db::users::update_user_flags(&state.db, user_id, flags)
            .await
            .map_err(|e| ApiError::Internal(anyhow::anyhow!(e.to_string())))?;

        return Ok(Json(json!({
            "id": updated.id.to_string(),
            "username": updated.username,
            "discriminator": updated.discriminator,
            "email": updated.email,
            "display_name": updated.display_name,
            "avatar_hash": updated.avatar_hash,
            "flags": updated.flags,
            "created_at": updated.created_at.to_rfc3339(),
        })));
    }

    Err(ApiError::BadRequest("No updates provided".into()))
}

pub async fn delete_user(
    State(state): State<AppState>,
    admin: AdminUser,
    Path(user_id): Path<i64>,
) -> Result<StatusCode, ApiError> {
    if user_id == admin.user_id {
        return Err(ApiError::BadRequest("Cannot delete yourself".into()));
    }

    paracord_core::admin::admin_delete_user(&state.db, user_id).await?;
    Ok(StatusCode::NO_CONTENT)
}

// ── Guilds ──────────────────────────────────────────────────────────────

pub async fn list_guilds(
    State(state): State<AppState>,
    _admin: AdminUser,
) -> Result<Json<Value>, ApiError> {
    let guilds = paracord_db::guilds::list_all_guilds(&state.db)
        .await
        .map_err(|e| ApiError::Internal(anyhow::anyhow!(e.to_string())))?;

    let guild_list: Vec<Value> = guilds
        .into_iter()
        .map(|g| {
            json!({
                "id": g.id.to_string(),
                "name": g.name,
                "description": g.description,
                "icon_hash": g.icon_hash,
                "owner_id": g.owner_id.to_string(),
                "created_at": g.created_at.to_rfc3339(),
            })
        })
        .collect();

    Ok(Json(json!({ "guilds": guild_list })))
}

pub async fn delete_guild(
    State(state): State<AppState>,
    _admin: AdminUser,
    Path(guild_id): Path<i64>,
) -> Result<StatusCode, ApiError> {
    paracord_core::admin::admin_delete_guild(&state.db, guild_id).await?;
    Ok(StatusCode::NO_CONTENT)
}
