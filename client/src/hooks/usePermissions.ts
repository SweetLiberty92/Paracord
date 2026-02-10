import { useMemo } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useGuildStore } from '../stores/guildStore';
import { useMemberStore } from '../stores/memberStore';
import { hasPermission, Permissions } from '../types';

function getUserIdFromToken(token: string | null): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  try {
    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
    const decoded = JSON.parse(atob(payload)) as { sub?: string | number };
    if (decoded.sub == null) return null;
    return String(decoded.sub);
  } catch {
    return null;
  }
}

export function usePermissions(guildId: string | null) {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const guild = useGuildStore((s) =>
    guildId ? s.guilds.find((g) => g.id === guildId) : null
  );
  const members = useMemberStore((s) =>
    guildId ? s.members.get(guildId) : null
  );

  return useMemo(() => {
    if (!guild)
      return { permissions: 0n, isOwner: false, isAdmin: false };

    const currentUserId = user?.id ?? getUserIdFromToken(token);
    if (!currentUserId) {
      return { permissions: 0n, isOwner: false, isAdmin: false };
    }

    const isOwner = String(guild.owner_id) === String(currentUserId);
    // Full implementation would compute from member roles;
    // for now, owners get all permissions
    const permissions = isOwner ? BigInt('0x7FFFFFFFFFFFFFFF') : 0n;
    const isAdmin =
      isOwner || hasPermission(permissions, Permissions.ADMINISTRATOR);

    return { permissions, isOwner, isAdmin };
  }, [user, token, guild, members]);
}
