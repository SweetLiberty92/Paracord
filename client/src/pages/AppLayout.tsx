import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from '../components/layout/Sidebar';
import { ChannelSidebar } from '../components/layout/ChannelSidebar';
import { MemberList } from '../components/layout/MemberList';
import { useUIStore } from '../stores/uiStore';
import { useGuildStore } from '../stores/guildStore';
import { cn } from '../lib/utils';

export function AppLayout() {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const memberSidebarOpen = useUIStore((s) => s.memberSidebarOpen);
  const selectedGuildId = useGuildStore((s) => s.selectedGuildId);
  const location = useLocation();
  const isSettingsRoute =
    location.pathname === '/app/settings'
    || location.pathname === '/app/admin'
    || /^\/app\/guilds\/[^/]+\/settings$/.test(location.pathname);
  const isGuildChannelRoute = /^\/app\/guilds\/[^/]+\/channels\/[^/]+$/.test(location.pathname);
  const showRailedShell = !isSettingsRoute;

  return (
    <div className={cn('relative h-screen overflow-hidden', showRailedShell ? 'p-2.5 md:p-3' : 'p-1.5 md:p-2')}>
      <div className="pointer-events-none absolute -left-24 top-0 h-80 w-80 rounded-full bg-accent-primary/22 blur-[110px]" />
      <div className="pointer-events-none absolute right-0 top-1/4 h-72 w-72 rounded-full bg-accent-success/12 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-accent-danger/8 blur-[140px]" />

      <div className={cn('relative flex h-full', showRailedShell ? 'gap-2.5 md:gap-3' : 'gap-0')}>
        {showRailedShell && (
          <div className="glass-rail h-full overflow-hidden rounded-2xl">
            <Sidebar />
          </div>
        )}

        {showRailedShell && (
          <motion.aside
            initial={false}
            animate={{
              width: sidebarOpen ? 'var(--spacing-channel-sidebar-width)' : 0,
              opacity: sidebarOpen ? 1 : 0,
            }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              'h-full overflow-hidden rounded-2xl',
              sidebarOpen ? 'pointer-events-auto' : 'pointer-events-none'
            )}
          >
            <div className="glass-rail h-full overflow-hidden">
              <ChannelSidebar />
            </div>
          </motion.aside>
        )}

        <main className="flex min-w-0 flex-1">
          {isSettingsRoute ? (
            <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border-subtle/70 bg-bg-tertiary/80">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.17, ease: [0.22, 1, 0.36, 1] }}
                  className="relative flex h-full flex-col"
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </div>
          ) : (
            <div className="glass-panel relative h-full w-full overflow-hidden rounded-2xl">
              <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-border-subtle/40" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={location.pathname}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.17, ease: [0.22, 1, 0.36, 1] }}
                  className="relative flex h-full flex-col overflow-hidden"
                >
                  <Outlet />
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </main>

        {selectedGuildId && memberSidebarOpen && isGuildChannelRoute && showRailedShell && (
          <div className="hidden h-full overflow-hidden rounded-2xl 2xl:block">
            <div className="glass-rail h-full overflow-hidden">
              <MemberList />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
