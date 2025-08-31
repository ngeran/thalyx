import React from 'react';
import { 
  Search, 
  Bell, 
  Sun, 
  Moon, 
  User, 
  ChevronRight, 
  Home,
  Menu 
} from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';

const NavigationBar = ({ 
  onSidebarToggle, 
  breadcrumbs = [],
  user = { name: 'John Doe', avatar: null } 
}) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-sidebar-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
      
      {/* Mobile sidebar trigger */}
      <button
        onClick={onSidebarToggle}
        className="lg:hidden p-2 hover:bg-sidebar-accent rounded-md transition-colors"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Breadcrumbs */}
      <nav className="flex items-center space-x-2 text-sm text-foreground/70">
        <Home className="h-4 w-4" />
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.path || index}>
            <ChevronRight className="h-4 w-4" />
            <span className={index === breadcrumbs.length - 1 ? 'text-foreground' : ''}>
              {crumb.title}
            </span>
          </React.Fragment>
        ))}
      </nav>

      <div className="flex-1" />

      {/* Search */}
      <div className="relative w-64 hidden md:block">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/50" />
        <input
          type="text"
          placeholder="Search..."
          className="w-full pl-10 pr-4 py-2 text-sm bg-background border border-sidebar-border rounded-lg
                   focus:ring-2 focus:ring-sidebar-ring focus:border-transparent
                   text-foreground placeholder:text-foreground/50"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 hover:bg-sidebar-accent rounded-md transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
        </button>

        {/* Notifications */}
        <button className="p-2 hover:bg-sidebar-accent rounded-md transition-colors relative">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* User Menu */}
        <button className="p-1 hover:bg-sidebar-accent rounded-md transition-colors">
          <div className="w-8 h-8 bg-sidebar-primary rounded-full flex items-center justify-center">
            <User className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
        </button>
      </div>
    </header>
  );
};

export default NavigationBar;
