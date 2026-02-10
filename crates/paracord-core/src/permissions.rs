use crate::error::CoreError;
use paracord_models::permissions::Permissions;
use paracord_db::DbPool;

pub const OVERWRITE_TARGET_ROLE: i16 = 0;
pub const OVERWRITE_TARGET_MEMBER: i16 = 1;

/// Compute effective permissions for a member in a guild
pub fn compute_base_permissions(
    member_role_permissions: &[(i64, i64)],
    guild_owner_id: i64,
    user_id: i64,
) -> Permissions {
    if user_id == guild_owner_id {
        return Permissions::all();
    }

    let mut perms = Permissions::empty();
    for (_role_id, bits) in member_role_permissions {
        perms |= Permissions::from_bits_truncate(*bits);
    }

    if perms.contains(Permissions::ADMINISTRATOR) {
        return Permissions::all();
    }

    perms
}

/// Check if permission set contains required permission, returning error if not
pub fn require_permission(perms: Permissions, required: Permissions) -> Result<(), CoreError> {
    if !perms.contains(required) {
        return Err(CoreError::MissingPermission);
    }
    Ok(())
}

/// Compute permissions from a set of Role rows
pub fn compute_permissions_from_roles(
    roles: &[paracord_db::roles::RoleRow],
    guild_owner_id: i64,
    user_id: i64,
) -> Permissions {
    if user_id == guild_owner_id {
        return Permissions::all();
    }

    let mut perms = Permissions::empty();
    for role in roles {
        perms |= Permissions::from_bits_truncate(role.permissions);
    }

    if perms.contains(Permissions::ADMINISTRATOR) {
        return Permissions::all();
    }

    perms
}

pub async fn is_guild_member(pool: &DbPool, guild_id: i64, user_id: i64) -> Result<bool, CoreError> {
    let member = paracord_db::members::get_member(pool, user_id, guild_id).await?;
    Ok(member.is_some())
}

pub async fn ensure_guild_member(pool: &DbPool, guild_id: i64, user_id: i64) -> Result<(), CoreError> {
    if !is_guild_member(pool, guild_id, user_id).await? {
        return Err(CoreError::Forbidden);
    }
    Ok(())
}

pub async fn compute_channel_permissions(
    pool: &DbPool,
    guild_id: i64,
    channel_id: i64,
    guild_owner_id: i64,
    user_id: i64,
) -> Result<Permissions, CoreError> {
    let roles = paracord_db::roles::get_member_roles(pool, user_id, guild_id).await?;
    let mut perms = compute_permissions_from_roles(&roles, guild_owner_id, user_id);
    if perms.contains(Permissions::ADMINISTRATOR) || user_id == guild_owner_id {
        return Ok(Permissions::all());
    }

    let overwrites = paracord_db::channel_overwrites::get_channel_overwrites(pool, channel_id).await?;
    if overwrites.is_empty() {
        return Ok(perms);
    }

    if let Some(everyone) = overwrites
        .iter()
        .find(|o| o.target_type == OVERWRITE_TARGET_ROLE && o.target_id == guild_id)
    {
        let deny = Permissions::from_bits_truncate(everyone.deny_perms);
        let allow = Permissions::from_bits_truncate(everyone.allow_perms);
        perms &= !deny;
        perms |= allow;
    }

    let role_ids: std::collections::HashSet<i64> = roles.iter().map(|r| r.id).collect();
    let mut role_deny = Permissions::empty();
    let mut role_allow = Permissions::empty();
    for overwrite in overwrites
        .iter()
        .filter(|o| o.target_type == OVERWRITE_TARGET_ROLE && role_ids.contains(&o.target_id))
    {
        role_deny |= Permissions::from_bits_truncate(overwrite.deny_perms);
        role_allow |= Permissions::from_bits_truncate(overwrite.allow_perms);
    }
    perms &= !role_deny;
    perms |= role_allow;

    if let Some(member_ow) = overwrites
        .iter()
        .find(|o| o.target_type == OVERWRITE_TARGET_MEMBER && o.target_id == user_id)
    {
        let deny = Permissions::from_bits_truncate(member_ow.deny_perms);
        let allow = Permissions::from_bits_truncate(member_ow.allow_perms);
        perms &= !deny;
        perms |= allow;
    }

    Ok(perms)
}
