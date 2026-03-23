import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useStore } from '../../store.ts';
import { Activity, BarChart3, Mountain, Settings } from 'lucide-react';

function NavItem({
  to,
  active,
  disabled,
  icon,
  label,
}: {
  to: string;
  active: boolean;
  disabled?: boolean;
  icon: ReactNode;
  label: string;
}): ReactNode {
  const base =
    'inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors select-none';
  const state = disabled
    ? 'opacity-50 cursor-not-allowed'
    : active
      ? 'text-marmot-orange'
      : 'text-marmot-text opacity-80 hover:text-marmot-orange hover:opacity-100';

  if (disabled) {
    return (
      <span className={`${base} ${state}`} aria-disabled="true">
        {icon}
        <span className="hidden sm:inline">{label}</span>
      </span>
    );
  }

  return (
    <Link to={to} className={`${base} ${state}`}>
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

export function Header(): ReactNode {
  const location = useLocation();
  const algorithm = useStore(state => state.algorithm);
  const loadedLogFilename = useStore(state => state.loadedLogFilename);

  const filename = loadedLogFilename ?? algorithm?.summary?.fileName ?? null;

  return (
    <header className="bg-marmot-surface border-b border-[rgba(255,140,0,0.2)]">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Mountain size={20} className="text-marmot-orange" />
            <div className="text-sm sm:text-base tracking-tight">
              <span className="opacity-90">AFTA </span>
              <span className="font-bold tracking-tighter">MARMOTS</span>
            </div>
          </div>

          <nav className="ml-2 hidden items-center gap-1 sm:flex">
            <NavItem
              to={`/${location.search}`}
              active={location.pathname === '/'}
              icon={<Activity size={18} />}
              label="Home"
            />
            <NavItem
              to={`/visualizer${location.search}`}
              active={location.pathname === '/visualizer'}
              disabled={algorithm === null}
              icon={<BarChart3 size={18} />}
              label="Visualizer"
            />
            <NavItem
              to={`/settings${location.search}`}
              active={location.pathname === '/settings'}
              disabled={true}
              icon={<Settings size={18} />}
              label="Settings"
            />
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden text-xs uppercase tracking-wider text-marmot-text opacity-70 sm:block">
            System Status
          </div>
          {filename ? (
            <div className="max-w-[260px] truncate rounded-md border border-[rgba(255,140,0,0.2)] bg-[rgba(255,140,0,0.12)] px-2 py-1 text-xs text-marmot-orange">
              {filename}
            </div>
          ) : (
            <div className="text-xs text-slate-400">No Log Loaded</div>
          )}
        </div>
      </div>
    </header>
  );
}
