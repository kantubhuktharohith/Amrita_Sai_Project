import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Home,
  BookOpen,
  GraduationCap,
  Newspaper,
  Compass,
  MessageSquare,
  Info,
  Upload,
  FileText,
  FolderUp,
  User,
  Shield,
  LogOut,
  LogIn,
  X,
  Sparkles,
} from "lucide-react";
import collegeLogo from "@/assets/college-logo.jpg";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Sidebar = ({ isCollapsed, mobileOpen, setMobileOpen }) => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin } = useIsAdmin();

  // Close mobile drawer on route change
  useEffect(() => {
    if (setMobileOpen) {
      setMobileOpen(false);
    }
  }, [location.pathname, setMobileOpen]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isActive = (path) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const navSections = [
    {
      title: "OVERVIEW",
      items: [
        { to: "/", label: "Home", icon: Home },
        { to: "/browse", label: "Browse Notes", icon: BookOpen },
        { to: "/exam-papers", label: "Exam Papers", icon: GraduationCap },
      ],
    },
    {
      title: "LEARNING",
      items: [
        { to: "/tech-news", label: "Tech News", icon: Newspaper, badge: "Daily" },
        {
          to: "/career-guidance",
          label: "Career Guide",
          icon: Compass,
          badge: "AI",
          isSpecial: true,
        },
        { to: "/community", label: "Community", icon: MessageSquare },
      ],
    },
    ...(isAdmin
      ? [
          {
            title: "ADMIN RESOURCES",
            items: [
              { to: "/upload", label: "Upload Notes", icon: Upload },
              { to: "/upload-exam-paper", label: "Upload Paper", icon: FileText },
              { to: "/my-uploads", label: "Manage Uploads", icon: FolderUp },
            ],
          },
        ]
      : []),
    {
      title: "ACCOUNT",
      items: [
        { to: "/profile", label: "Profile", icon: User },
        ...(isAdmin
          ? [{ to: "/admin", label: "Admin Panel", icon: Shield, isAdminItem: true }]
          : []),
        { to: "/about", label: "About", icon: Info },
      ],
    },
  ];

  // ================= EXPANDED VIEW (IMAGE 1) =================
  const renderExpandedContent = () => (
    <div className="flex flex-col h-full justify-between overflow-hidden">
      {/* Scrollbar-free smooth content */}
      <div className="flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-2 px-3 space-y-3">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-0.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 px-3 py-1">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`group flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                    active
                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`h-4.5 w-4.5 transition-colors shrink-0 ${
                        active
                          ? "text-primary-foreground"
                          : item.isAdminItem
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-foreground"
                      }`}
                    />
                    <span className={item.isAdminItem && !active ? "text-primary font-medium" : ""}>
                      {item.label}
                    </span>
                  </div>

                  {item.badge && (
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        active
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {item.isSpecial && !item.badge && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        active
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-primary/15 text-primary"
                      }`}
                    >
                      <Sparkles className="h-3 w-3" />
                      <span>AI</span>
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Bottom Log out button without border line */}
      <div className="p-2.5">
        {user ? (
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
          >
            <LogOut className="h-4.5 w-4.5 shrink-0" />
            <span>Log out</span>
          </button>
        ) : (
          <Link
            to="/login"
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary transition"
          >
            <LogIn className="h-4.5 w-4.5 shrink-0" />
            <span>Sign in</span>
          </Link>
        )}
      </div>
    </div>
  );

  // ================= COLLAPSED VIEW (IMAGE 2 - MINI ICON RAIL) =================
  const renderCollapsedContent = () => (
    <TooltipProvider delayDuration={100}>
      <div className="flex flex-col h-full justify-between items-center py-2 overflow-hidden">
        {/* Scrollbar-free icon stack */}
        <div className="flex-1 w-full space-y-2.5 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden px-2 flex flex-col items-center">
          {navSections.map((section) => (
            <div key={section.title} className="space-y-1 flex flex-col items-center w-full">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to);
                return (
                  <Tooltip key={item.to}>
                    <TooltipTrigger asChild>
                      <Link
                        to={item.to}
                        className={`flex items-center justify-center w-9 h-9 rounded-xl transition-all ${
                          active
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-4.5 w-4.5" />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium text-xs">
                      {item.label}
                      {item.badge && (
                        <span className="ml-1.5 text-[10px] text-orange-400">
                          ({item.badge})
                        </span>
                      )}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          ))}
        </div>

        {/* Bottom logout icon without line */}
        <div className="pt-1 w-full flex justify-center">
          {user ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={signOut}
                  className="flex items-center justify-center w-9 h-9 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium text-xs text-destructive">
                Log out
              </TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/login"
                  className="flex items-center justify-center w-9 h-9 rounded-xl text-muted-foreground hover:bg-primary/10 hover:text-primary transition"
                >
                  <LogIn className="h-4.5 w-4.5" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="font-medium text-xs">
                Sign in
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  );

  return (
    <>
      {/* ================= MOBILE DRAWER / OVERLAY ================= */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden animate-fade-in">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen && setMobileOpen(false)}
          />

          {/* Drawer content without border line */}
          <aside className="relative flex h-full w-[280px] max-w-[85vw] flex-col bg-card shadow-2xl z-10 overflow-hidden">
            {/* Header */}
            <div className="flex h-14 items-center justify-between border-b px-4">
              <Link to="/" className="flex items-center gap-2.5">
                <img
                  src={collegeLogo}
                  alt="CampusOrbit Logo"
                  className="h-8 w-8 rounded-lg object-cover"
                />
                <div>
                  <div className="font-display text-sm font-bold leading-none">
                    CampusOrbit
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Amrita Sai Institute
                  </div>
                </div>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileOpen && setMobileOpen(false)}
                className="h-8 w-8 rounded-md"
                title="Close menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              {renderExpandedContent()}
            </div>
          </aside>
        </div>
      )}

      {/* ================= DESKTOP SIDEBAR WITHOUT BORDER LINE ================= */}
      <aside
        className={`hidden md:flex flex-col sticky top-14 h-[calc(100vh-3.5rem)] shrink-0 bg-card/95 backdrop-blur-md z-30 transition-all duration-300 overflow-hidden ${
          isCollapsed ? "w-[72px]" : "w-64"
        }`}
      >
        {isCollapsed ? renderCollapsedContent() : renderExpandedContent()}
      </aside>
    </>
  );
};

export default Sidebar;
