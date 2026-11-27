import React, { useState, useEffect } from "react";
import { Zap, ChevronRight, ChevronLeft, ExternalLink } from "lucide-react";
export const BreakingNewsTicker = ({ news, onSelectNews, }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const breakingItems = news.slice(0, 8);
    useEffect(() => {
        if (breakingItems.length <= 1 || isPaused)
            return;
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % breakingItems.length);
        }, 4500);
        return () => clearInterval(timer);
    }, [breakingItems.length, isPaused]);
    if (breakingItems.length === 0)
        return null;
    const currentItem = breakingItems[currentIndex] || breakingItems[0];
    const handlePrev = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev === 0 ? breakingItems.length - 1 : prev - 1));
    };
    const handleNext = (e) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev + 1) % breakingItems.length);
    };
    return (<div onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)} className="relative mb-6 overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-background to-primary/5 p-2 sm:p-2.5 shadow-sm transition-all hover:border-primary/50">
      <div className="flex items-center justify-between gap-3">
        {/* Left Live Badge */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75"/>
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600"/>
          </span>
          <span className="flex items-center gap-1 rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-white shadow-xs">
            <Zap className="h-3 w-3 fill-current"/>
            Breaking
          </span>
        </div>

        {/* Center Rotating Headline */}
        <div onClick={() => onSelectNews(currentItem)} className="min-w-0 flex-1 cursor-pointer transition-opacity duration-300">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <span className="font-semibold text-foreground hover:text-primary transition-colors truncate">
              {currentItem.title}
            </span>
            <span className="hidden md:inline-flex items-center gap-1 rounded-full bg-muted/80 px-2 py-0.5 text-[10px] text-muted-foreground shrink-0">
              {currentItem.source} • {currentItem.publishedAt}
            </span>
            <ExternalLink className="h-3 w-3 text-muted-foreground opacity-50 shrink-0 hidden sm:inline-block"/>
          </div>
        </div>

        {/* Right Navigation Controls */}
        <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
          <span className="text-[10px] font-mono mr-1 hidden sm:inline-block">
            {currentIndex + 1}/{breakingItems.length}
          </span>
          <button type="button" onClick={handlePrev} className="h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center transition-colors" title="Previous story">
            <ChevronLeft className="h-3.5 w-3.5"/>
          </button>
          <button type="button" onClick={handleNext} className="h-6 w-6 rounded-md hover:bg-muted flex items-center justify-center transition-colors" title="Next story">
            <ChevronRight className="h-3.5 w-3.5"/>
          </button>
        </div>
      </div>
    </div>);
};
export default BreakingNewsTicker;
