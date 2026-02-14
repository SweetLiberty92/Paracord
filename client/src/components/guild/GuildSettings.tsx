import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import { X, Upload, GripVertical, Shield, Users, Hash, Link, Gavel, ScrollText, RefreshCw, Trash2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { guildApi } from '../../api/guilds';
import { inviteApi } from '../../api/invites';
import { channelApi } from '../../api/channels';
import { useGuildStore } from '../../stores/guildStore';
import { useAuthStore } from '../../stores/authStore';
import { invalidateGuildPermissionCache, usePermissions } from '../../hooks/usePermissions';
import { Permissions, hasPermission } from '../../types';
import type { AuditLogEntry, Ban, Channel, Guild, Invite, Member, Role } from '../../types';
import { isAllowedImageMimeType, isSafeImageDataUrl } from '../../lib/security';
import { cn } from '../../lib/utils';

interface GuildSettingsProps {
  guildId: string;
  guildName: string;
  onClose: () => void;
}

type SettingsSection = 'overview' | 'roles' | 'members' | 'channels' | 'invites' | 'bans' | 'audit-log';

const NAV_ITEMS: { id: SettingsSection; label: string; icon: ReactNode }[] = [
  { id: 'overview', label: 'Overview', icon: <Hash size={16} /> },
  { id: 'roles', label: 'Roles', icon: <Shield size={16} /> },
  { id: 'members', label: 'Members', icon: <Users size={16} /> },
  { id: 'channels', label: 'Channels', icon: <Hash size={16} /> },
  { id: 'invites', label: 'Invites', icon: <Link size={16} /> },
  { id: 'bans', label: 'Bans', icon: <Gavel size={16} /> },
  { id: 'audit-log', label: 'Audit Log', icon: <ScrollText size={16} /> },
];

export function GuildSettings({ guildId, guildName, onClose }: GuildSettingsProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const leaveGuild = useGuildStore((s) => s.leaveGuild);
  const authUser = useAuthStore((s) => s.user);
  const { permissions, isAdmin } = usePermissions(guildId);
  const canManageRoleSettings = isAdmin || hasPermission(permissions, Permissions.MANAGE_GUILD);
  const memberRoleId = guildId;
  const [activeSection, setActiveSection] = useState<SettingsSection>('overview');
  const [guild, setGuild] = useState<Guild | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [bans, setBans] = useState<Ban[]>([]);
  const [auditEntries, setAuditEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(guildName);
  const [description, setDescription] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleColor, setNewRoleColor] = useState('#99aab5');
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [editingRolePermissions, setEditingRolePermissions] = useState<number>(0);
  const [editingRoleColor, setEditingRoleColor] = useState('#99aab5');
  const [editingRoleHoist, setEditingRoleHoist] = useState(false);
  const [editingRoleMentionable, setEditingRoleMentionable] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<'text' | 'voice'>('text');
  const [newChannelRequiredRoleIds, setNewChannelRequiredRoleIds] = useState<string[]>([]);
  const [editingChannelRoleIds, setEditingChannelRoleIds] = useState<Record<string, string[]>>({});
  const [editingChannelAccessId, setEditingChannelAccessId] = useState<string | null>(null);
  const [memberSearch, setMemberSearch] = useState('');
  const [editingMemberRoleUserId, setEditingMemberRoleUserId] = useState<string | null>(null);
  const [draftMemberRoleIds, setDraftMemberRoleIds] = useState<string[]>([]);
  const [iconDataUrl, setIconDataUrl] = useState<string | null>(null);
  const [banReasonInput, setBanReasonInput] = useState('');
  const [banConfirmUserId, setBanConfirmUserId] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 768px)').matches;
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  const getApiErrorMessage = (err: unknown, fallback: string) => {
    const responseData = (err as { response?: { data?: { message?: string; error?: string } } }).response?.data;
    return responseData?.message || responseData?.error || fallback;
  };

  const runAction = async (action: () => Promise<void>, fallback: string) => {
    setError(null);
    try {
      await action();
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, fallback));
    }
  };

  const refreshAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [guildRes, rolesRes, membersRes, channelsRes, invitesRes, bansRes, auditRes] =
        await Promise.all([
          guildApi.get(guildId),
          guildApi.getRoles(guildId),
          guildApi.getMembers(guildId),
          guildApi.getChannels(guildId),
          guildApi.getInvites(guildId),
          guildApi.getBans(guildId),
          guildApi.getAuditLog(guildId),
        ]);
      setGuild(guildRes.data);
      setName(guildRes.data.name || guildName);
      setDescription(guildRes.data.description || '');
      const incomingIcon = guildRes.data.icon_hash;
      if (!incomingIcon) {
        setIconDataUrl(null);
      } else if (incomingIcon.startsWith('data:')) {
        setIconDataUrl(isSafeImageDataUrl(incomingIcon) ? incomingIcon : null);
      } else {
        setIconDataUrl(`/api/v1/guilds/${guildId}/icon`);
      }
      setRoles(rolesRes.data);
      setMembers(membersRes.data);
      const normalizedChannels = channelsRes.data.map((channel) => ({
        ...channel,
        required_role_ids: channel.required_role_ids ?? [],
      }));
      setChannels(normalizedChannels);
      setEditingChannelRoleIds(
        Object.fromEntries(
          normalizedChannels.map((channel) => [channel.id, channel.required_role_ids ?? []])
        )
      );
      setInvites(invitesRes.data);
      setBans(bansRes.data);
      setAuditEntries(auditRes.data.audit_log_entries || []);
    } catch (err: unknown) {
      setError(getApiErrorMessage(err, 'Failed to load guild settings'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refreshAll();
  }, [guildId]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requested = params.get('section');
    if (
      requested === 'overview' ||
      requested === 'roles' ||
      requested === 'members' ||
      requested === 'channels' ||
      requested === 'invites' ||
      requested === 'bans' ||
      requested === 'audit-log'
    ) {
      setActiveSection(requested);
    }
  }, [location.search]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(max-width: 768px)');
    const updateIsMobile = () => setIsMobile(mediaQuery.matches);
    updateIsMobile();
    mediaQuery.addEventListener('change', updateIsMobile);
    return () => mediaQuery.removeEventListener('change', updateIsMobile);
  }, []);

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return members;
    const q = memberSearch.toLowerCase();
    return members.filter((m) => (m.nick || m.user.username || '').toLowerCase().includes(q));
  }, [members, memberSearch]);
  const assignableRoles = useMemo(
    () => roles.filter((role) => role.id !== memberRoleId),
    [roles, memberRoleId]
  );

  const roleColorHex = (role: Role) =>
    role.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#99aab5';

  const toggleRoleId = (roleIds: string[], roleId: string) =>
    roleIds.includes(roleId)
      ? roleIds.filter((id) => id !== roleId)
      : [...roleIds, roleId];

  const saveOverview = async () => {
    await runAction(async () => {
      await guildApi.update(guildId, {
        name,
        description,
        icon: iconDataUrl?.startsWith('data:') ? iconDataUrl : undefined,
      });
      await refreshAll();
    }, 'Failed to save server overview');
  };

  const onGuildIconChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!isAllowedImageMimeType(file.type)) {
      setError('Please upload PNG, JPG, GIF, or WEBP.');
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setIconDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const createRole = async () => {
    if (!canManageRoleSettings) return;
    if (!newRoleName.trim()) return;
    const colorInt = parseInt(newRoleColor.replace('#', ''), 16) || 0;
    await runAction(async () => {
      await guildApi.createRole(guildId, { name: newRoleName.trim(), color: colorInt, permissions: 0 });
      invalidateGuildPermissionCache(guildId);
      setNewRoleName('');
      setNewRoleColor('#99aab5');
      await refreshAll();
    }, 'Failed to create role');
  };

  const renameRole = async (roleId: string, nextName: string) => {
    if (!canManageRoleSettings) return;
    if (!nextName.trim()) return;
    await runAction(async () => {
      await guildApi.updateRole(guildId, roleId, { name: nextName.trim() });
      invalidateGuildPermissionCache(guildId);
      await refreshAll();
    }, 'Failed to update role');
  };

  const startEditingRole = (role: Role) => {
    setEditingRoleId(role.id);
    setEditingRoleColor('#' + (role.color || 0).toString(16).padStart(6, '0'));
    setEditingRolePermissions(typeof role.permissions === 'string' ? parseInt(role.permissions, 10) || 0 : role.permissions);
    setEditingRoleHoist(role.hoist);
    setEditingRoleMentionable(role.mentionable);
  };

  const saveRoleEdits = async () => {
    if (!canManageRoleSettings) return;
    if (!editingRoleId) return;
    const colorInt = parseInt(editingRoleColor.replace('#', ''), 16) || 0;
    await runAction(async () => {
      await guildApi.updateRole(guildId, editingRoleId!, {
        color: colorInt,
        permissions: editingRolePermissions,
        hoist: editingRoleHoist,
        mentionable: editingRoleMentionable,
      } as Partial<Role>);
      invalidateGuildPermissionCache(guildId);
      setEditingRoleId(null);
      await refreshAll();
    }, 'Failed to save role');
  };

  const cancelRoleEditing = () => {
    setEditingRoleId(null);
  };

  const togglePermission = (flag: number) => {
    setEditingRolePermissions((prev) =>
      (prev & flag) ? prev & ~flag : prev | flag
    );
  };

  const deleteRole = async (roleId: string) => {
    if (!canManageRoleSettings) return;
    await runAction(async () => {
      await guildApi.deleteRole(guildId, roleId);
      invalidateGuildPermissionCache(guildId);
      await refreshAll();
    }, 'Failed to delete role');
  };

  const startEditingMemberRoles = (member: Member) => {
    if (!canManageRoleSettings) return;
    setEditingMemberRoleUserId(member.user.id);
    setDraftMemberRoleIds((member.roles || []).filter((roleId) => roleId !== memberRoleId));
  };

  const saveMemberRoles = async (userId: string) => {
    if (!canManageRoleSettings) return;
    await runAction(async () => {
      await guildApi.updateMember(guildId, userId, {
        roles: [memberRoleId, ...draftMemberRoleIds],
      });
      invalidateGuildPermissionCache(guildId);
      setEditingMemberRoleUserId(null);
      setDraftMemberRoleIds([]);
      await refreshAll();
    }, 'Failed to update member roles');
  };

  const updateChannelRequiredRoles = async (channelId: string) => {
    if (!canManageRoleSettings) return;
    const requiredRoleIds = editingChannelRoleIds[channelId] || [];
    await runAction(async () => {
      await channelApi.update(channelId, { required_role_ids: requiredRoleIds });
      await refreshAll();
    }, 'Failed to update channel access roles');
  };

  const createChannel = async () => {
    if (!newChannelName.trim()) return;
    await runAction(async () => {
      await guildApi.createChannel(guildId, {
        name: newChannelName.trim(),
        channel_type: newChannelType === 'voice' ? 2 : 0,
        parent_id: null,
        ...(canManageRoleSettings ? { required_role_ids: newChannelRequiredRoleIds } : {}),
      });
      setNewChannelName('');
      setNewChannelRequiredRoleIds([]);
      await refreshAll();
    }, 'Failed to create channel');
  };

  const deleteChannel = async (channelId: string) => {
    await runAction(async () => {
      await channelApi.delete(channelId);
      await refreshAll();
    }, 'Failed to delete channel');
  };

  const kickMember = async (userId: string) => {
    await runAction(async () => {
      await guildApi.kickMember(guildId, userId);
      await refreshAll();
    }, 'Failed to kick member');
  };

  const banMember = async (userId: string, reason: string) => {
    await runAction(async () => {
      await guildApi.banMember(guildId, userId, reason || 'No reason provided');
      setBanConfirmUserId(null);
      setBanReasonInput('');
      await refreshAll();
    }, 'Failed to ban member');
  };

  const revokeInvite = async (code: string) => {
    await runAction(async () => {
      await inviteApi.delete(code);
      await refreshAll();
    }, 'Failed to revoke invite');
  };

  const createInvite = async () => {
    const firstTextChannel = channels.find((c) => c.type === 0) || channels.find((c) => c.type !== 4);
    if (!firstTextChannel) return;
    await runAction(async () => {
      await guildApi.createInvite(firstTextChannel.id, { max_age: 86400, max_uses: 0 });
      await refreshAll();
    }, 'Failed to create invite');
  };

  const unban = async (userId: string) => {
    await runAction(async () => {
      await guildApi.unbanMember(guildId, userId);
      await refreshAll();
    }, 'Failed to unban user');
  };

  const handleLeaveGuild = async () => {
    if (!window.confirm('Leave this server?')) return;
    await runAction(async () => {
      await leaveGuild(guildId);
      onClose();
      navigate('/app/friends');
    }, 'Failed to leave server');
  };

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-bg-tertiary/95 backdrop-blur-sm',
        isMobile ? 'flex flex-col' : 'flex'
      )}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="pointer-events-none absolute -left-20 top-0 h-72 w-72 rounded-full blur-[120px]" style={{ backgroundColor: 'var(--ambient-glow-primary)' }} />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full blur-[140px]" style={{ backgroundColor: 'var(--ambient-glow-success)' }} />

      {isMobile ? (
        <div className="relative z-10 border-b border-border-subtle/70 bg-bg-secondary/70 px-3 pb-2.5 pt-[calc(var(--safe-top)+0.75rem)]">
          <div className="mb-2 flex items-center justify-between">
            <div className="truncate text-xs font-semibold uppercase tracking-wide text-text-muted">
              {guild?.name || guildName}
            </div>
            <button onClick={onClose} className="command-icon-btn h-9 w-9 rounded-full border border-border-strong bg-bg-secondary/75">
              <X size={17} />
            </button>
          </div>
          <div className="scrollbar-thin flex items-center gap-2 overflow-x-auto pb-1">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition-colors',
                  activeSection === item.id
                    ? 'border-border-strong bg-bg-mod-strong text-text-primary'
                    : 'border-border-subtle/70 bg-bg-mod-subtle text-text-secondary'
                )}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="relative z-10 w-72 shrink-0 overflow-y-auto border-r border-border-subtle/70 bg-bg-secondary/65 px-5 py-10">
          <div className="ml-auto w-full max-w-[236px]">
            <div className="px-2 pb-4 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {guild?.name || guildName}
            </div>
            <div className="flex flex-col gap-3">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`settings-nav-item p-6 ${activeSection === item.id ? 'active' : ''}`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className={cn('relative z-10 flex-1 overflow-y-auto', isMobile ? 'px-6 pb-[calc(var(--safe-bottom)+1rem)] pt-6' : 'px-12 py-10')}>
        <div className="w-full max-w-[740px] space-y-10">
        {!isMobile && (
          <div className="fixed right-6 top-5 z-20 flex flex-col items-center gap-1">
            <button onClick={onClose} className="command-icon-btn rounded-full border border-border-strong bg-bg-secondary/75">
              <X size={18} />
            </button>
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted">Esc</span>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-accent-danger/35 bg-accent-danger/10 px-4 py-2.5 text-sm font-medium text-accent-danger">{error}</div>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => void refreshAll()}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border-subtle bg-bg-mod-subtle px-4 text-sm font-semibold text-text-secondary hover:bg-bg-mod-strong hover:text-text-primary"
          >
            <RefreshCw size={15} />
            Refresh
          </button>
          {loading && <span className="text-sm text-text-muted">Loading...</span>}
        </div>

        {activeSection === 'overview' && (
          <div className="settings-surface-card min-h-[calc(100dvh-13.5rem)] !p-8 max-sm:!p-6 card-stack-relaxed">
            <h2 className="settings-section-title !mb-0">Server Overview</h2>
            <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
              <div className="flex-shrink-0">
                <label className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={onGuildIconChange} />
                  <div
                    className="w-24 h-24 rounded-full flex flex-col items-center justify-center border-2 border-dashed transition-colors hover:border-[var(--interactive-normal)]"
                    style={{ borderColor: 'var(--interactive-muted)', backgroundColor: 'var(--bg-secondary)' }}
                  >
                    {iconDataUrl ? (
                      <img src={iconDataUrl} alt="Server icon" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <>
                        <Upload size={20} style={{ color: 'var(--text-muted)' }} />
                        <span className="text-[10px] mt-1 font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>
                          Upload
                        </span>
                      </>
                    )}
                  </div>
                </label>
              </div>
              <div className="flex-1 card-stack-relaxed">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Server Name</span>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-field mt-3" />
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Description</span>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="input-field mt-3 resize-none"
                    placeholder="Describe your server"
                  />
                </label>
              </div>
            </div>
            <div className="settings-action-row">
              <button className="btn-primary" onClick={() => void saveOverview()}>Save Changes</button>
              {guild && authUser && guild.owner_id !== authUser.id && (
                <button className="btn-ghost" onClick={() => void handleLeaveGuild()}>
                  Leave Server
                </button>
              )}
            </div>
            <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-4">
              <div className="card-surface min-h-[5.5rem] rounded-xl border border-border-subtle bg-bg-mod-subtle/70 px-3.5 py-3.5">
                <div className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Members</div>
                <div className="mt-1 text-xl font-semibold text-text-primary">{members.length}</div>
              </div>
              <div className="card-surface min-h-[5.5rem] rounded-xl border border-border-subtle bg-bg-mod-subtle/70 px-3.5 py-3.5">
                <div className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Roles</div>
                <div className="mt-1 text-xl font-semibold text-text-primary">{roles.length}</div>
              </div>
              <div className="card-surface min-h-[5.5rem] rounded-xl border border-border-subtle bg-bg-mod-subtle/70 px-3.5 py-3.5">
                <div className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Channels</div>
                <div className="mt-1 text-xl font-semibold text-text-primary">{channels.length}</div>
              </div>
              <div className="card-surface min-h-[5.5rem] rounded-xl border border-border-subtle bg-bg-mod-subtle/70 px-3.5 py-3.5">
                <div className="text-sm font-semibold uppercase tracking-wide text-text-secondary">Active Invites</div>
                <div className="mt-1 text-xl font-semibold text-text-primary">{invites.length}</div>
              </div>
            </div>
            <div className="card-surface rounded-xl border border-border-subtle bg-bg-mod-subtle/60 px-4 py-3 text-sm leading-6 text-text-secondary">
              Keep this server profile complete so new members instantly recognize your community and can orient themselves faster.
            </div>
          </div>
        )}

        {activeSection === 'roles' && (
          <div className="settings-surface-card min-h-[calc(100dvh-13.5rem)] !p-8 max-sm:!p-6 card-stack-relaxed">
            <h2 className="settings-section-title !mb-0">Roles</h2>
            {!canManageRoleSettings && (
              <div className="card-surface rounded-xl border border-border-subtle bg-bg-mod-subtle/60 px-4 py-3 text-sm text-text-secondary">
                Only server admins can create, edit, or assign roles.
              </div>
            )}
            <div className="card-stack">
              {roles.map((role) => {
                const roleColor = roleColorHex(role);
                const isEditing = editingRoleId === role.id;
                return (
                  <div key={role.id}>
                    <div className="card-surface flex flex-wrap items-center gap-2.5 rounded-xl border border-border-subtle bg-bg-mod-subtle/70 px-4 py-3.5">
                      <GripVertical size={16} style={{ color: 'var(--text-muted)' }} />
                      <div className="w-3.5 h-3.5 rounded-full flex-shrink-0 border border-border-subtle" style={{ backgroundColor: roleColor }} />
                      <input
                        className="flex-1 bg-transparent text-base leading-normal outline-none"
                        style={{ color: roleColor !== '#000000' ? roleColor : 'var(--text-primary)' }}
                        defaultValue={role.name}
                        disabled={!canManageRoleSettings}
                        onBlur={(e) => {
                          if (!canManageRoleSettings) return;
                          if (e.target.value !== role.name) void renameRole(role.id, e.target.value);
                        }}
                      />
                      {role.hoist && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border border-border-subtle" style={{ color: 'var(--text-muted)' }}>Hoisted</span>
                      )}
                      {canManageRoleSettings && role.id !== guildId && (
                        <button
                          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-bg-mod-strong hover:text-text-primary"
                          onClick={() => isEditing ? cancelRoleEditing() : startEditingRole(role)}
                        >
                          {isEditing ? 'Close' : 'Edit'}
                        </button>
                      )}
                      {canManageRoleSettings && role.id !== guildId && (
                        <button className="icon-btn" onClick={() => void deleteRole(role.id)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    {isEditing && (
                      <div className="card-surface ml-0 mt-3 rounded-xl border border-border-subtle bg-bg-primary/60 p-6 space-y-6 sm:ml-8">
                        <div className="flex items-center gap-4">
                          <label className="block">
                            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Color</span>
                            <div className="mt-1 flex items-center gap-2">
                              <input
                                type="color"
                                value={editingRoleColor}
                                onChange={(e) => setEditingRoleColor(e.target.value)}
                                className="h-9 w-9 cursor-pointer rounded-lg border border-border-subtle bg-transparent"
                              />
                              <input
                                type="text"
                                value={editingRoleColor}
                                onChange={(e) => setEditingRoleColor(e.target.value)}
                                className="input-field w-28"
                                maxLength={7}
                              />
                            </div>
                          </label>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingRoleHoist}
                              onChange={(e) => setEditingRoleHoist(e.target.checked)}
                              className="h-4 w-4 rounded border-border-subtle accent-accent-primary"
                            />
                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Display separately (hoist)</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={editingRoleMentionable}
                              onChange={(e) => setEditingRoleMentionable(e.target.checked)}
                              className="h-4 w-4 rounded border-border-subtle accent-accent-primary"
                            />
                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Allow anyone to @mention this role</span>
                          </label>
                        </div>
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Permissions</span>
                          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                            {[
                              { name: 'Manage Channels', flag: 1 << 4 },
                              { name: 'Manage Server', flag: 1 << 5 },
                              { name: 'Manage Messages', flag: 1 << 13 },
                              { name: 'Manage Roles', flag: 1 << 28 },
                              { name: 'Kick Members', flag: 1 << 1 },
                              { name: 'Ban Members', flag: 1 << 2 },
                              { name: 'Administrator', flag: 1 << 3 },
                              { name: 'Send Messages', flag: 1 << 11 },
                              { name: 'Attach Files', flag: 1 << 15 },
                              { name: 'Add Reactions', flag: 1 << 6 },
                              { name: 'Connect (Voice)', flag: 1 << 20 },
                              { name: 'Speak (Voice)', flag: 1 << 21 },
                              { name: 'Stream', flag: 1 << 9 },
                              { name: 'View Audit Log', flag: 1 << 7 },
                              { name: 'Create Invite', flag: 1 << 0 },
                              { name: 'Change Nickname', flag: 1 << 26 },
                            ].map((perm) => (
                              <label key={perm.name} className="flex items-center gap-2 cursor-pointer rounded-lg px-2 py-1.5 hover:bg-bg-mod-subtle transition-colors">
                                <input
                                  type="checkbox"
                                  checked={(editingRolePermissions & perm.flag) !== 0}
                                  onChange={() => togglePermission(perm.flag)}
                                  className="h-4 w-4 rounded border-border-subtle accent-accent-primary"
                                />
                                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{perm.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="settings-action-row">
                          <button className="btn-primary" onClick={() => void saveRoleEdits()}>Save Changes</button>
                          <button
                            className="rounded-lg px-3.5 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-bg-mod-strong hover:text-text-primary"
                            onClick={cancelRoleEditing}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {canManageRoleSettings && (
              <div className="settings-action-row">
                <input className="input-field flex-1" placeholder="New role name" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} />
                <input
                  type="color"
                  value={newRoleColor}
                  onChange={(e) => setNewRoleColor(e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-lg border border-border-subtle bg-transparent"
                  title="Role color"
                />
                <button className="btn-primary" onClick={() => void createRole()}>Create Role</button>
              </div>
            )}
          </div>
        )}

        {activeSection === 'members' && (
          <div className="settings-surface-card min-h-[calc(100dvh-13.5rem)] !p-8 max-sm:!p-6 card-stack">
            <h2 className="settings-section-title !mb-0">Members</h2>
            <input type="text" placeholder="Search members" className="input-field" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} />
            <div className="card-stack">
              {filteredMembers.map((member) => (
                <div key={member.user.id}>
                  <div className="card-surface flex flex-wrap items-center gap-2.5 rounded-xl border border-border-subtle bg-bg-mod-subtle/70 px-3.5 py-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold" style={{ backgroundColor: 'var(--accent-primary)' }}>
                      {member.user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm block" style={{ color: 'var(--text-primary)' }}>
                        {member.nick || member.user.username}
                      </span>
                      {member.nick && (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {member.user.username}
                        </span>
                      )}
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      {member.roles && member.roles.length > 0 && (
                        <div className="hidden sm:flex items-center gap-1 mr-2">
                          {member.roles
                            .filter((roleId) => roleId !== memberRoleId)
                            .slice(0, 3)
                            .map((roleId) => {
                            const role = roles.find((r) => r.id === roleId);
                            if (!role) return null;
                            const rColor = roleColorHex(role);
                            return (
                              <span key={roleId} className="inline-flex items-center gap-1 rounded-md border border-border-subtle px-1.5 py-0.5 text-[11px] font-medium" style={{ color: rColor }}>
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: rColor }} />
                                {role.name}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      {canManageRoleSettings && (
                        <button
                          className="rounded-lg px-3.5 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-bg-mod-strong hover:text-text-primary"
                          onClick={() => {
                            if (editingMemberRoleUserId === member.user.id) {
                              setEditingMemberRoleUserId(null);
                              setDraftMemberRoleIds([]);
                              return;
                            }
                            startEditingMemberRoles(member);
                          }}
                        >
                          {editingMemberRoleUserId === member.user.id ? 'Close Roles' : 'Roles'}
                        </button>
                      )}
                      <button className="rounded-lg px-3.5 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-bg-mod-strong hover:text-text-primary" onClick={() => void kickMember(member.user.id)}>Kick</button>
                      <button
                        className="rounded-lg px-3.5 py-2 text-sm font-semibold text-accent-danger transition-colors hover:bg-accent-danger/15"
                        onClick={() => {
                          setBanConfirmUserId(member.user.id);
                          setBanReasonInput('');
                        }}
                      >
                        Ban
                      </button>
                    </div>
                  </div>
                  {banConfirmUserId === member.user.id && (
                    <div className="card-surface ml-10 mt-2 rounded-xl border border-accent-danger/30 bg-accent-danger/5 p-3 space-y-2">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Ban {member.user.username}?
                      </p>
                      <input
                        type="text"
                        placeholder="Reason for ban (optional)"
                        value={banReasonInput}
                        onChange={(e) => setBanReasonInput(e.target.value)}
                        className="input-field w-full"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void banMember(member.user.id, banReasonInput);
                          if (e.key === 'Escape') setBanConfirmUserId(null);
                        }}
                        autoFocus
                      />
                      <div className="flex items-center gap-2">
                        <button
                          className="rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors"
                          style={{ backgroundColor: 'var(--accent-danger)', color: '#fff' }}
                          onClick={() => void banMember(member.user.id, banReasonInput)}
                        >
                          Confirm Ban
                        </button>
                        <button
                          className="rounded-lg px-3 py-1.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-bg-mod-subtle"
                          onClick={() => setBanConfirmUserId(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                  {canManageRoleSettings && editingMemberRoleUserId === member.user.id && (
                    <div className="card-surface ml-10 mt-2 rounded-xl border border-border-subtle bg-bg-primary/60 p-3 space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                        Extra Access Roles (Member role is always included)
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {assignableRoles.map((role) => {
                          const checked = draftMemberRoleIds.includes(role.id);
                          return (
                            <label
                              key={role.id}
                              className="card-surface flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-mod-subtle/60 px-2.5 py-2 text-sm text-text-secondary"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setDraftMemberRoleIds((prev) => toggleRoleId(prev, role.id))
                                }
                                className="h-4 w-4 rounded border-border-subtle accent-accent-primary"
                              />
                              <span
                                className="inline-block h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: roleColorHex(role) }}
                              />
                              <span className="truncate">{role.name}</span>
                            </label>
                          );
                        })}
                        {assignableRoles.length === 0 && (
                          <p className="text-sm text-text-muted">No assignable roles yet.</p>
                        )}
                      </div>
                      <div className="settings-action-row">
                        <button
                          className="btn-primary"
                          onClick={() => void saveMemberRoles(member.user.id)}
                        >
                          Save Roles
                        </button>
                        <button
                          className="rounded-lg px-3.5 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-bg-mod-strong hover:text-text-primary"
                          onClick={() => {
                            setEditingMemberRoleUserId(null);
                            setDraftMemberRoleIds([]);
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {filteredMembers.length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No members found.</p>}
            </div>
          </div>
        )}

        {activeSection === 'channels' && (
          <div className="settings-surface-card min-h-[calc(100dvh-13.5rem)] !p-8 max-sm:!p-6 card-stack">
            <h2 className="settings-section-title !mb-0">Channels</h2>
            {!canManageRoleSettings && (
              <div className="card-surface rounded-xl border border-border-subtle bg-bg-mod-subtle/60 px-4 py-3 text-sm text-text-secondary">
                Channel role requirements can only be changed by server admins.
              </div>
            )}
            <div className="card-stack">
              {channels.sort((a, b) => a.position - b.position).map((channel) => {
                const requiredRoleIds = editingChannelRoleIds[channel.id] ?? channel.required_role_ids ?? [];
                const isEditingAccess = editingChannelAccessId === channel.id;
                return (
                  <div key={channel.id}>
                    <div className="card-surface flex flex-wrap items-center gap-2.5 rounded-xl border border-border-subtle bg-bg-mod-subtle/70 px-3.5 py-3">
                      <Hash size={16} />
                      <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{channel.name || 'unnamed'}</span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{channel.type === 2 ? 'voice' : 'text'}</span>
                      <span className="rounded-lg border border-border-subtle px-2 py-1 text-[11px] font-semibold text-text-secondary">
                        Access: Member{requiredRoleIds.length > 0 ? ` + ${requiredRoleIds.length}` : ''}
                      </span>
                      {canManageRoleSettings && (
                        <button
                          className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-text-secondary transition-colors hover:bg-bg-mod-strong hover:text-text-primary"
                          onClick={() => setEditingChannelAccessId((prev) => (prev === channel.id ? null : channel.id))}
                        >
                          {isEditingAccess ? 'Close Access' : 'Access Roles'}
                        </button>
                      )}
                      <button className="icon-btn" onClick={() => void deleteChannel(channel.id)}><Trash2 size={14} /></button>
                    </div>
                    {canManageRoleSettings && isEditingAccess && (
                      <div className="card-surface ml-10 mt-2 rounded-xl border border-border-subtle bg-bg-primary/60 p-3 space-y-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                          Require Additional Roles
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {assignableRoles.map((role) => {
                            const checked = requiredRoleIds.includes(role.id);
                            return (
                              <label
                                key={role.id}
                                className="card-surface flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-mod-subtle/60 px-2.5 py-2 text-sm text-text-secondary"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() =>
                                    setEditingChannelRoleIds((prev) => ({
                                      ...prev,
                                      [channel.id]: toggleRoleId(prev[channel.id] ?? [], role.id),
                                    }))
                                  }
                                  className="h-4 w-4 rounded border-border-subtle accent-accent-primary"
                                />
                                <span
                                  className="inline-block h-2.5 w-2.5 rounded-full"
                                  style={{ backgroundColor: roleColorHex(role) }}
                                />
                                <span className="truncate">{role.name}</span>
                              </label>
                            );
                          })}
                          {assignableRoles.length === 0 && (
                            <p className="text-sm text-text-muted">Create roles to limit channel access.</p>
                          )}
                        </div>
                        <div className="settings-action-row">
                          <button
                            className="btn-primary"
                            onClick={() => void updateChannelRequiredRoles(channel.id)}
                          >
                            Save Access
                          </button>
                          <button
                            className="rounded-lg px-3.5 py-2 text-sm font-semibold text-text-secondary transition-colors hover:bg-bg-mod-strong hover:text-text-primary"
                            onClick={() => {
                              setEditingChannelRoleIds((prev) => ({
                                ...prev,
                                [channel.id]: channel.required_role_ids ?? [],
                              }));
                              setEditingChannelAccessId(null);
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div className="settings-action-row">
                <input className="input-field flex-1" placeholder="New channel name" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} />
                <select className="select-field min-w-[8.75rem]" value={newChannelType} onChange={(e) => setNewChannelType(e.target.value as 'text' | 'voice')}>
                  <option value="text">Text</option>
                  <option value="voice">Voice</option>
                </select>
                <button className="btn-primary" onClick={() => void createChannel()}>Create</button>
              </div>
              {canManageRoleSettings && (
                <div className="card-surface rounded-xl border border-border-subtle bg-bg-mod-subtle/60 px-3.5 py-3 space-y-2.5">
                  <div className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                    New Channel: Additional Required Roles
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {assignableRoles.map((role) => {
                      const checked = newChannelRequiredRoleIds.includes(role.id);
                      return (
                        <label
                          key={role.id}
                          className="card-surface flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-primary/50 px-2.5 py-2 text-sm text-text-secondary"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setNewChannelRequiredRoleIds((prev) => toggleRoleId(prev, role.id))
                            }
                            className="h-4 w-4 rounded border-border-subtle accent-accent-primary"
                          />
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: roleColorHex(role) }}
                          />
                          <span className="truncate">{role.name}</span>
                        </label>
                      );
                    })}
                    {assignableRoles.length === 0 && (
                      <p className="text-sm text-text-muted">No extra roles available yet.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === 'invites' && (
          <div className="settings-surface-card min-h-[calc(100dvh-13.5rem)] !p-8 max-sm:!p-6 card-stack">
            <h2 className="settings-section-title !mb-0">Invites</h2>
            <div className="settings-action-row">
              <button className="btn-primary text-sm" onClick={() => void createInvite()}>
                Create Invite
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-border-subtle">
              <div className="hidden items-center bg-bg-secondary px-4 py-2.5 text-xs font-semibold uppercase text-text-muted sm:flex">
                <span className="flex-1">Code</span>
                <span className="w-24">Uses</span>
                <span className="w-24">Expires</span>
                <span className="w-16"></span>
              </div>
              {invites.map((invite) => (
                <div key={invite.code} className="flex flex-col items-start gap-1.5 px-4 py-3 text-sm sm:flex-row sm:items-center sm:gap-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  <span className="flex-1 font-semibold sm:font-normal" style={{ color: 'var(--text-primary)' }}>{invite.code}</span>
                  <span className="text-xs sm:w-24 sm:text-sm" style={{ color: 'var(--text-muted)' }}>Uses: {invite.uses}/{invite.max_uses || 'inf'}</span>
                  <span className="text-xs sm:w-24 sm:text-sm" style={{ color: 'var(--text-muted)' }}>Expires: {invite.max_age || 'never'}</span>
                  <button
                    className="inline-flex h-9 items-center justify-center rounded-lg border border-transparent px-3 text-sm font-semibold text-accent-danger transition-colors hover:border-accent-danger/35 hover:bg-accent-danger/12"
                    onClick={() => void revokeInvite(invite.code)}
                  >
                    Revoke
                  </button>
                </div>
              ))}
              {invites.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Link size={24} style={{ color: 'var(--text-muted)' }} className="mb-2" />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No active invites.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === 'bans' && (
          <div className="settings-surface-card min-h-[calc(100dvh-13.5rem)] !p-8 max-sm:!p-6 card-stack">
            <h2 className="settings-section-title !mb-0">Bans</h2>
            <div className="card-stack">
              {bans.map((ban) => (
                <div key={ban.user.id} className="card-surface flex flex-wrap items-center gap-2.5 rounded-xl border border-border-subtle bg-bg-mod-subtle/70 px-3.5 py-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0" style={{ backgroundColor: 'var(--accent-danger)' }}>
                    {ban.user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm block" style={{ color: 'var(--text-primary)' }}>{ban.user.username}</span>
                    {ban.reason && (
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Reason: {ban.reason}</span>
                    )}
                  </div>
                  <button className="rounded-lg px-3 py-1.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-bg-mod-strong hover:text-text-primary" onClick={() => void unban(ban.user.id)}>Unban</button>
                </div>
              ))}
              {bans.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8">
                  <Gavel size={36} style={{ color: 'var(--text-muted)' }} className="mb-2" />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No banned users.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === 'audit-log' && (
          <div className="settings-surface-card min-h-[calc(100dvh-13.5rem)] !p-8 max-sm:!p-6 card-stack">
            <h2 className="settings-section-title !mb-0">Audit Log</h2>
            <div className="card-stack">
              {auditEntries.map((entry) => (
                <div key={entry.id} className="card-surface rounded-xl border border-border-subtle bg-bg-mod-subtle/70 px-3.5 py-3">
                  <div className="text-sm" style={{ color: 'var(--text-primary)' }}>Action {entry.action_type} on {entry.target_id || 'n/a'}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    by {entry.user_id} at {new Date(entry.created_at).toLocaleString()}
                  </div>
                  {entry.reason && <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Reason: {entry.reason}</div>}
                </div>
              ))}
              {auditEntries.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8">
                  <ScrollText size={36} style={{ color: 'var(--text-muted)' }} className="mb-2" />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No audit log entries.</p>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

