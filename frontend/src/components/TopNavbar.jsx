import { Link } from "react-router-dom";
import { Menu, User, LogOut, Shield, FolderUp, Upload } from "lucide-react";
import collegeLogo from "@/assets/college-logo.jpg";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TopNavbar = ({ onToggleSidebar }) => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();

  // Get user initial (e.g., 'R' like in the screenshot)
  const getUserInitial = () => {
    if (!user) return "U";
    if (user.name) return user.name.charAt(0).toUpperCase();
    if (user.email) return user.email.charAt(0).toUpperCase();
    return "R";
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur-md">
      {/* Left: Hamburger menu toggle + College Logo & App Brand */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg"
          title="Toggle sidebar (Expand / Collapse)"
          aria-label="Toggle sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src={collegeLogo}
            alt="CampusOrbit Logo"
            className="h-8 w-8 rounded-lg object-cover shadow-xs"
          />
          <div className="flex flex-col">
            <span className="font-display text-base font-bold tracking-tight text-foreground group-hover:text-primary transition-colors leading-none">
              CampusOrbit
            </span>
            <span className="text-[10px] text-muted-foreground font-medium mt-0.5 hidden sm:inline">
              Amrita Sai Institute
            </span>
          </div>
        </Link>
      </div>

      {/* Right: User Avatar / Auth CTA */}
      <div className="flex items-center gap-3">
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary border border-primary/30 font-bold text-sm shadow-xs transition hover:ring-2 hover:ring-primary/20 hover:scale-105 focus:outline-none"
                title={user.email || "Account"}
              >
                {getUserInitial()}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-3 py-2 border-b border-border/50">
                <p className="text-xs font-semibold text-foreground truncate">
                  {user.email}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Student Account
                </p>
              </div>

              <DropdownMenuItem asChild>
                <Link to="/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>

              {isAdmin && (
                <>
                  <DropdownMenuItem asChild>
                    <Link to="/upload" className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>Upload Notes</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuItem asChild>
                    <Link to="/my-uploads" className="cursor-pointer">
                      <FolderUp className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>My Uploads</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/admin" className="cursor-pointer text-primary font-medium">
                      <Shield className="mr-2 h-4 w-4 text-primary" />
                      <span>Admin Panel</span>
                    </Link>
                  </DropdownMenuItem>
                </>
              )}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={signOut}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="h-8 text-xs">
                Sign In
              </Button>
            </Link>
            <Link to="/signup">
              <Button size="sm" className="h-8 text-xs bg-hero-gradient text-primary-foreground hover:opacity-90">
                Sign Up
              </Button>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default TopNavbar;
