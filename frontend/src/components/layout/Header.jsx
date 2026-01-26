import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, Settings, Keyboard } from 'lucide-react';
import { useSettings } from '@/contexts/SettingsContext';

export function Header({ onMenuClick, onShortcutsClick }) {
  const { user, logout } = useAuth();
  const { setIsSettingsOpen } = useSettings();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
            Payment Dashboard
          </h1>
        </div>
        
        <div className="flex items-center gap-2">
          {onShortcutsClick && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onShortcutsClick}
              title="Keyboard Shortcuts (Ctrl+?)"
            >
              <Keyboard className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsSettingsOpen(true)}
            title="Settings (Ctrl+,)"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <div className="hidden sm:flex items-center gap-2 text-sm px-2">
            <span className="text-muted-foreground">Welcome,</span>
            <span className="font-semibold">{user?.username || user?.id}</span>
            <span className="text-muted-foreground">({user?.role})</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}

