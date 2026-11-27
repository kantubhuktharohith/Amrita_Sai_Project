import React, { useState, useEffect, useMemo, useCallback } from "react";
import { TECH_CATEGORIES, CURATED_TECH_NEWS, getBookmarkedNewsIds, getLikedNewsIds, fetchRealtimeNewsFeed, } from "@/data/techNewsData";
import { TechNewsCard } from "@/components/news/TechNewsCard";
import { TechNewsDetailModal } from "@/components/news/TechNewsDetailModal";
import { BreakingNewsTicker } from "@/components/news/BreakingNewsTicker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, RefreshCw, Newspaper, Bookmark, Radio, Clock, X, } from "lucide-react";
import { toast } from "sonner";
export const TechNewsPage = () => {
    const [newsList, setNewsList] = useState(CURATED_TECH_NEWS);
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [selectedSource, setSelectedSource] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [bookmarkedIds, setBookmarkedIds] = useState([]);
    const [likedIds, setLikedIds] = useState([]);
    const [selectedNewsItem, setSelectedNewsItem] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showSavedOnly, setShowSavedOnly] = useState(false);
    const [isLiveActive, setIsLiveActive] = useState(false);
    const [newsProvider, setNewsProvider] = useState("Live Feeds");
    const [isApiKeyActive, setIsApiKeyActive] = useState(false);
    const [lastUpdatedTime, setLastUpdatedTime] = useState(new Date());
    const [autoSync, setAutoSync] = useState(true);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    // Load saved bookmarks and likes
    useEffect(() => {
        setBookmarkedIds(getBookmarkedNewsIds());
        setLikedIds(getLikedNewsIds());
    }, []);
    // Fetch real-time news feed
    const loadNews = useCallback(async (isManualRefresh = false) => {
        if (isManualRefresh) {
            setIsRefreshing(true);
        }
        try {
            const res = await fetchRealtimeNewsFeed({
                category: "all",
                refresh: isManualRefresh,
            });
            if (res && res.items.length > 0) {
                setNewsList(res.items);
                setIsLiveActive(res.isLive);
                if (res.provider)
                    setNewsProvider(res.provider);
                if (res.apiKeyActive !== undefined)
                    setIsApiKeyActive(res.apiKeyActive);
                setLastUpdatedTime(new Date(res.lastUpdated || Date.now()));
                setElapsedSeconds(0);
                if (isManualRefresh) {
                    toast.success(res.isLive
                        ? `Live stream refreshed! ${res.items.length} stories synchronized.`
                        : "Refreshed stories from feed!");
                }
            }
        }
        catch (err) {
            console.warn("Error loading real-time news:", err);
            if (isManualRefresh) {
                toast.error("Could not reach live stream. Showing offline stories.");
            }
        }
        finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);
    // Initial load
    useEffect(() => {
        loadNews(false);
    }, [loadNews]);
    // Real-time Auto-Sync interval (every 60 seconds if autoSync is true)
    useEffect(() => {
        if (!autoSync)
            return;
        const interval = setInterval(() => {
            loadNews(false);
        }, 60000);
        return () => clearInterval(interval);
    }, [autoSync, loadNews]);
    // Elapsed seconds timer tick
    useEffect(() => {
        const timer = setInterval(() => {
            setElapsedSeconds((prev) => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);
    const formatElapsed = (sec) => {
        if (sec < 5)
            return "just now";
        if (sec < 60)
            return `${sec}s ago`;
        const mins = Math.floor(sec / 60);
        return `${mins}m ago`;
    };
    const handleBookmarkToggle = (id, state) => {
        setBookmarkedIds((prev) => {
            const exists = prev.includes(id);
            const shouldAdd = state !== undefined ? state : !exists;
            if (shouldAdd) {
                return exists ? prev : [id, ...prev];
            }
            else {
                return prev.filter((item) => item !== id);
            }
        });
    };
    const handleLikeToggle = (id, state) => {
        setLikedIds((prev) => {
            const exists = prev.includes(id);
            const shouldAdd = state !== undefined ? state : !exists;
            if (shouldAdd) {
                return exists ? prev : [id, ...prev];
            }
            else {
                return prev.filter((item) => item !== id);
            }
        });
    };
    // Distinct sources list
    const availableSources = useMemo(() => {
        const set = new Set();
        newsList.forEach((n) => {
            if (n.source)
                set.add(n.source);
        });
        return Array.from(set).slice(0, 8);
    }, [newsList]);
    // Category counts
    const categoryCounts = useMemo(() => {
        const map = { all: newsList.length };
        TECH_CATEGORIES.forEach((cat) => {
            if (cat.id !== "all") {
                map[cat.id] = newsList.filter((n) => n.category === cat.id).length;
            }
        });
        return map;
    }, [newsList]);
    // Filter & Search Logic
    const filteredNews = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        return newsList.filter((item) => {
            if (showSavedOnly && !bookmarkedIds.includes(item.id)) {
                return false;
            }
            if (selectedCategory !== "all" && item.category !== selectedCategory) {
                return false;
            }
            if (selectedSource !== "all" && item.source !== selectedSource) {
                return false;
            }
            if (!query)
                return true;
            const titleMatch = item.title.toLowerCase().includes(query);
            const summaryMatch = item.summary.toLowerCase().includes(query);
            const takeawayMatch = item.studentTakeaway?.toLowerCase().includes(query);
            const tagsMatch = item.tags.some((t) => t.toLowerCase().includes(query));
            const sourceMatch = item.source.toLowerCase().includes(query);
            return titleMatch || summaryMatch || takeawayMatch || tagsMatch || sourceMatch;
        });
    }, [newsList, selectedCategory, selectedSource, searchQuery, showSavedOnly, bookmarkedIds]);
    return (<div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        {/* Real-time Header with Live Radar Status */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 border-b pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="relative flex h-3 w-3">
                {isLiveActive ? (<>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"/>
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500"/>
                  </>) : (<span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500"/>)}
              </span>
              <Badge variant="outline" className={`text-[11px] font-semibold gap-1 ${isLiveActive
            ? isApiKeyActive
                ? "border-blue-500/40 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            : "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"}`}>
                <Radio className="h-3 w-3"/>
                {isLiveActive
            ? isApiKeyActive
                ? `⚡ API KEY ACTIVE • ${newsProvider}`
                : `LIVE RADAR • ${newsProvider}`
            : "CACHED FEED"}
              </Badge>

              <span className="text-xs text-muted-foreground hidden sm:inline-flex items-center gap-1">
                <Clock className="h-3 w-3"/> Synced {formatElapsed(elapsedSeconds)}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              CampusOrbit Real-Time News Radar
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Live updates across Artificial Intelligence, Software Engineering, Campus Placements,
              and Higher Education aggregated from Google News, DEV Community & Hacker News.
            </p>
          </div>

          {/* Action Controls: Auto-Sync Switch + Refresh Button */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <div className="flex items-center gap-2 bg-card border rounded-lg px-3 py-1.5 shadow-2xs">
              <Switch id="auto-sync" checked={autoSync} onCheckedChange={setAutoSync} className="scale-80"/>
              <label htmlFor="auto-sync" className="text-xs font-medium cursor-pointer text-muted-foreground select-none">
                Auto-sync (60s)
              </label>
            </div>

            <Button variant="outline" size="sm" onClick={() => loadNews(true)} disabled={isRefreshing || isLoading} className="h-9 gap-1.5 text-xs font-medium">
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`}/>
              <span>{isRefreshing ? "Updating..." : "Refresh Live"}</span>
            </Button>
          </div>
        </div>

        {/* Breaking News Ticker */}
        {newsList.length > 0 && (<BreakingNewsTicker news={newsList} onSelectNews={(item) => setSelectedNewsItem(item)}/>)}

        {/* Category Tabs with Dynamic Live Counters */}
        <div className="mb-6 overflow-x-auto pb-2 scrollbar-none">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-max">
            {TECH_CATEGORIES.map((cat) => {
            const count = categoryCounts[cat.id] || 0;
            const isSelected = selectedCategory === cat.id;
            return (<button key={cat.id} onClick={() => setSelectedCategory(cat.id)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isSelected
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                    : "bg-card border text-muted-foreground hover:text-foreground hover:bg-accent"}`}>
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  <span className={`ml-1 text-[10px] px-1.5 py-0.2 rounded-full ${isSelected
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"}`}>
                    {count}
                  </span>
                </button>);
        })}
          </div>
        </div>

        {/* Search & Source Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6 bg-card border rounded-xl p-3 shadow-2xs">
          {/* Search Input */}
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/>
            <Input type="text" placeholder="Search live stories, skills, company, or topics..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-8 h-9 text-sm bg-background rounded-lg border-muted"/>
            {searchQuery && (<button type="button" onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-3.5 w-3.5"/>
              </button>)}
          </div>

          {/* Source Filter Chips & Saved Bookmark Filter */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Source dropdown / pills */}
            {availableSources.length > 0 && (<select aria-label="Filter news by source" value={selectedSource} onChange={(e) => setSelectedSource(e.target.value)} className="h-9 px-3 text-xs rounded-lg border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="all">All Sources ({newsList.length})</option>
                {availableSources.map((src) => (<option key={src} value={src}>
                    {src}
                  </option>))}
              </select>)}

            {/* Saved Only Filter Button */}
            <Button size="sm" variant={showSavedOnly ? "default" : "outline"} onClick={() => setShowSavedOnly(!showSavedOnly)} className="h-9 text-xs gap-1.5">
              <Bookmark className={`h-3.5 w-3.5 ${showSavedOnly ? "fill-current" : ""}`}/>
              <span>Saved ({bookmarkedIds.length})</span>
            </Button>
          </div>
        </div>

        {/* Loading Skeletons */}
        {isLoading ? (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((idx) => (<div key={idx} className="rounded-2xl border bg-card p-4 flex flex-col gap-3 shadow-xs">
                <Skeleton className="aspect-video w-full rounded-xl"/>
                <Skeleton className="h-4 w-3/4 rounded"/>
                <Skeleton className="h-4 w-full rounded"/>
                <Skeleton className="h-3 w-5/6 rounded"/>
                <div className="flex justify-between items-center pt-2">
                  <Skeleton className="h-6 w-20 rounded-full"/>
                  <Skeleton className="h-6 w-16 rounded-full"/>
                </div>
              </div>))}
          </div>) : filteredNews.length > 0 ? (
        /* Responsive Grid of Real-Time News Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredNews.map((news) => (<TechNewsCard key={news.id} news={news} isBookmarked={bookmarkedIds.includes(news.id)} onBookmarkToggle={handleBookmarkToggle} isLiked={likedIds.includes(news.id)} onLikeToggle={handleLikeToggle} onSelect={(item) => setSelectedNewsItem(item)}/>))}
          </div>) : (
        /* Empty State */
        <div className="rounded-xl border bg-card p-12 text-center shadow-xs">
            <Newspaper className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60"/>
            <h3 className="font-semibold text-base mb-1">No articles found</h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-sm mx-auto mb-4">
              {showSavedOnly
                ? "You haven't bookmarked any tech articles yet. Click the bookmark icon on any article to build your reading list!"
                : "No stories match your current search and filter criteria."}
            </p>
            {showSavedOnly ? (<Button size="sm" onClick={() => setShowSavedOnly(false)} variant="outline">
                View All Articles
              </Button>) : (<Button size="sm" onClick={() => {
                    setSearchQuery("");
                    setSelectedCategory("all");
                    setSelectedSource("all");
                }} variant="outline">
                Reset Filters
              </Button>)}
          </div>)}
      </div>

      {/* Full Information Reader Modal */}
      <TechNewsDetailModal news={selectedNewsItem} isOpen={!!selectedNewsItem} onClose={() => setSelectedNewsItem(null)} isBookmarked={selectedNewsItem ? bookmarkedIds.includes(selectedNewsItem.id) : false} onBookmarkToggle={handleBookmarkToggle} isLiked={selectedNewsItem ? likedIds.includes(selectedNewsItem.id) : false} onLikeToggle={handleLikeToggle}/>
    </div>);
};
export default TechNewsPage;
