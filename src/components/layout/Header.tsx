import { useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import {
  Button, Input, DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui';
import { Bell, Search, Sun, Moon, Menu, User, LogOut, Settings, HelpCircle, ChevronDown } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);

  return (
    <header className="h-12 flex items-center gap-3 px-4 border-b border-[--color-border] bg-[--color-background]">
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={onToggleSidebar}>
        <Menu className="h-4 w-4" />
      </Button>

      {/* Search */}
      <div className="relative w-64 hidden sm:block">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[--color-muted-foreground]" />
        <Input placeholder="Search runs, files, products…" className="pl-8 h-8 text-xs w-full" />
      </div>

      <div className="ml-auto flex items-center gap-1">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {[
              { title: 'Run completed', desc: 'Q4-2024 GAAP Reserve — MYGA Base finished in 42m', time: '2h ago' },
              { title: 'File validated', desc: 'MYGA_Inforce_Q42024.csv passed validation', time: '4h ago' },
              { title: 'Run failed', desc: 'DI Reserve run failed — schema error in inforce file', time: '1d ago' },
            ].map((n, i) => (
              <DropdownMenuItem key={i} className="flex flex-col items-start gap-0.5 py-2">
                <span className="text-sm font-medium">{n.title}</span>
                <span className="text-xs text-[--color-muted-foreground] whitespace-normal leading-snug">{n.desc}</span>
                <span className="text-[10px] text-[--color-muted-foreground]">{n.time}</span>
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-xs text-center justify-center text-[--color-primary]">
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Theme toggle */}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleTheme}>
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 gap-2 px-2">
              <div className="h-6 w-6 rounded-full bg-[--color-primary] flex items-center justify-center text-white text-xs font-bold">
                SC
              </div>
              <span className="text-xs hidden sm:inline">Sarah Chen</span>
              <ChevronDown className="h-3 w-3 hidden sm:inline" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">Sarah Chen</p>
                <p className="text-xs text-[--color-muted-foreground] font-normal">sarah.chen@company.com</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem><User className="h-4 w-4" /> Profile</DropdownMenuItem>
            <DropdownMenuItem><Settings className="h-4 w-4" /> Settings</DropdownMenuItem>
            <DropdownMenuItem><HelpCircle className="h-4 w-4" /> Help & Docs</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600"><LogOut className="h-4 w-4" /> Sign Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
