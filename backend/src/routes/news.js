import { Router } from 'express';
import Parser from 'rss-parser';
const router = Router();
const parser = new Parser({
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/rss+xml, application/xml, text/xml; q=0.1',
    },
    timeout: 8000,
});
// Category image fallbacks
const CATEGORY_IMAGES = {
    ai: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1000&auto=format&fit=crop&q=80',
    software: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=1000&auto=format&fit=crop&q=80',
    cyber: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=1000&auto=format&fit=crop&q=80',
    hardware: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1000&auto=format&fit=crop&q=80',
    cloud: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1000&auto=format&fit=crop&q=80',
    placements: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1000&auto=format&fit=crop&q=80',
};
// Clean HTML tags and entities
function cleanHtml(html) {
    if (!html)
        return '';
    return html
        .replace(/<[^>]*>?/gm, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();
}
// Format relative time
function formatRelativeTime(dateString) {
    if (!dateString)
        return 'Recent';
    try {
        const diffMs = Date.now() - new Date(dateString).getTime();
        if (isNaN(diffMs))
            return 'Recent';
        const minutes = Math.floor(diffMs / (1000 * 60));
        if (minutes < 1)
            return 'Just now';
        if (minutes < 60)
            return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24)
            return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7)
            return `${days}d ago`;
        return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    catch {
        return 'Recent';
    }
}
// In-memory cache
let cachedNews = [];
let lastFetchedAt = 0;
const CACHE_TTL_MS = 4 * 60 * 1000; // 4 minutes cache
async function fetchGoogleNewsRSS(feedUrl, defaultCategory, defaultTag) {
    try {
        const feed = await parser.parseURL(feedUrl);
        if (!feed.items || feed.items.length === 0)
            return [];
        return feed.items.slice(0, 10).map((item, index) => {
            let rawTitle = item.title || 'Tech Headline';
            let source = 'Google News';
            // Google News RSS titles usually end with: " - SourceName"
            const dashIdx = rawTitle.lastIndexOf(' - ');
            if (dashIdx > 0) {
                source = rawTitle.substring(dashIdx + 3).trim();
                rawTitle = rawTitle.substring(0, dashIdx).trim();
            }
            const summary = cleanHtml(item.contentSnippet || item.content || item.summary || rawTitle);
            const category = defaultCategory;
            const pubDate = item.pubDate || item.isoDate;
            const relativeTime = formatRelativeTime(pubDate);
            let takeaway = 'Staying informed on industry breakthroughs gives you an edge in campus technical discussions.';
            if (category === 'ai') {
                takeaway = 'Campus Prep: Pay attention to applied AI architectures and model inference techniques recruiters look for.';
            }
            else if (category === 'placements') {
                takeaway = 'Placement Tip: Keep track of hiring cycles, market skills in demand, and recruitment criteria.';
            }
            else if (category === 'cyber') {
                takeaway = 'Security Insight: Analyze how systems handle secure authentication, encryption, and safe input parsing.';
            }
            return {
                id: `gn-${category}-${index}-${Date.now().toString(36)}`,
                title: rawTitle,
                summary: summary.slice(0, 240) + (summary.length > 240 ? '...' : ''),
                fullContent: [
                    summary,
                    `This real-time story was reported by ${source} and aggregated via live syndicated news. As technology rapidly evolves, understanding production workflows and real-world system implementations equips engineering students with practical insight beyond textbooks.`,
                    `Students preparing for campus placements, technical interviews, and semester engineering projects are encouraged to follow the full coverage to deepen domain knowledge.`
                ],
                keyPoints: [
                    `Real-time update reported by ${source}.`,
                    `Directly impacts current industry practices in ${category.toUpperCase()}.`,
                    `Useful talking point for campus interviews and system design discussions.`
                ],
                studentTakeaway: takeaway,
                category,
                source,
                sourceBadgeText: source.slice(0, 3).toUpperCase(),
                sourceBadgeBg: 'bg-primary/20',
                sourceBadgeColor: 'text-primary',
                url: item.link || item.guid || 'https://news.google.com',
                publishedAt: relativeTime,
                readTime: '3 min read',
                tags: [defaultTag, category.toUpperCase(), 'LiveNews'],
                isHot: index < 2,
                imageUrl: CATEGORY_IMAGES[category] || CATEGORY_IMAGES.software,
                likesCount: Math.floor(Math.random() * 200) + 85,
                origin: 'google-news',
            };
        });
    }
    catch (err) {
        console.warn(`[NewsService] Failed to fetch RSS from ${feedUrl}:`, err?.message);
        return [];
    }
}
async function fetchDevToArticles() {
    try {
        const res = await fetch('https://dev.to/api/articles?tag=programming&per_page=12', {
            headers: { 'User-Agent': 'CampusOrbit-StudyHub/1.0' },
        });
        if (!res.ok)
            return [];
        const articles = (await res.json());
        return articles.map((art) => {
            const tags = Array.isArray(art.tag_list) ? art.tag_list : [];
            let cat = 'software';
            if (tags.some((t) => ['ai', 'machinelearning', 'deeplearning', 'datascience'].includes(t.toLowerCase()))) {
                cat = 'ai';
            }
            else if (tags.some((t) => ['security', 'cybersecurity', 'infosec'].includes(t.toLowerCase()))) {
                cat = 'cyber';
            }
            else if (tags.some((t) => ['devops', 'cloud', 'aws', 'docker', 'kubernetes'].includes(t.toLowerCase()))) {
                cat = 'cloud';
            }
            else if (tags.some((t) => ['career', 'interview', 'jobsearch'].includes(t.toLowerCase()))) {
                cat = 'placements';
            }
            return {
                id: `devto-${art.id}`,
                title: art.title,
                summary: art.description || `Practical guide and insights from developer ${art.user?.name || 'community contributor'}.`,
                fullContent: [
                    art.description || art.title,
                    `Published by ${art.user?.name || 'Senior Developer'} on DEV Community. Technical write-ups like this illustrate production code practices, code patterns, and debugging methodologies used by active software teams.`,
                    `Explore the complete discussion and code snippets on DEV Community to see community answers and related GitHub repositories.`
                ],
                keyPoints: [
                    `Published by ${art.user?.name || 'Dev.to author'} with ${art.positive_reactions_count || 50}+ community reactions.`,
                    `Covers real-world practical implementations and code examples.`,
                    `Great reference for project development and technical viva questions.`
                ],
                studentTakeaway: `Engineering Insight: Understanding how engineers structure software solutions on Dev.to is ideal for crafting impressive final-year and mini projects.`,
                category: cat,
                source: 'DEV Community',
                sourceBadgeText: 'DEV',
                sourceBadgeBg: 'bg-black text-white dark:bg-white dark:text-black',
                sourceBadgeColor: 'text-foreground',
                url: art.url,
                publishedAt: formatRelativeTime(art.published_at),
                readTime: `${art.reading_time_minutes || 4} min read`,
                tags: tags.slice(0, 4),
                isHot: (art.positive_reactions_count || 0) > 100,
                imageUrl: art.cover_image || art.social_image || CATEGORY_IMAGES[cat] || CATEGORY_IMAGES.software,
                author: art.user?.name,
                likesCount: art.positive_reactions_count || 120,
                origin: 'dev-to',
            };
        });
    }
    catch (err) {
        console.warn('[NewsService] Failed to fetch Dev.to articles:', err?.message);
        return [];
    }
}
async function fetchHackerNewsTop() {
    try {
        const res = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json?limitToFirst=15&orderBy=%22$key%22');
        if (!res.ok)
            return [];
        const storyIds = (await res.json());
        const selectedIds = storyIds.slice(0, 8);
        const storyPromises = selectedIds.map(async (id) => {
            try {
                const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
                if (!itemRes.ok)
                    return null;
                return (await itemRes.json());
            }
            catch {
                return null;
            }
        });
        const stories = await Promise.all(storyPromises);
        return stories
            .filter((s) => Boolean(s && s.title && s.url))
            .map((s) => {
            const titleLower = s.title.toLowerCase();
            let cat = 'software';
            if (titleLower.includes('ai') || titleLower.includes('llm') || titleLower.includes('gpt') || titleLower.includes('neural')) {
                cat = 'ai';
            }
            else if (titleLower.includes('security') || titleLower.includes('vulnerability') || titleLower.includes('cve') || titleLower.includes('hack')) {
                cat = 'cyber';
            }
            else if (titleLower.includes('chip') || titleLower.includes('gpu') || titleLower.includes('semiconductor') || titleLower.includes('arm')) {
                cat = 'hardware';
            }
            else if (titleLower.includes('cloud') || titleLower.includes('aws') || titleLower.includes('kubernetes') || titleLower.includes('database')) {
                cat = 'cloud';
            }
            let domain = 'Hacker News';
            try {
                domain = new URL(s.url).hostname.replace(/^www\./, '');
            }
            catch { }
            return {
                id: `hn-${s.id}`,
                title: s.title,
                summary: `Global engineering discussion (${s.score || 120}+ points). Trending topic among systems architects and senior engineers worldwide.`,
                fullContent: [
                    `This story is trending on Hacker News with over ${s.score || 100} upvotes and hundreds of active comments.`,
                    `The topic covers significant technical developments, architectural shifts, and open-source breakthroughs.`,
                    `Students looking to understand high-level system trade-offs will find the comments and source materials highly educational.`
                ],
                keyPoints: [
                    `Trending on Hacker News with ${s.score || 100}+ developer upvotes.`,
                    `Direct relevance to modern engineering and tech infrastructure.`,
                    `Provides real-world perspectives on emerging tech debates.`
                ],
                studentTakeaway: 'Tech Edge: Reading Hacker News discussions exposes you to the practical arguments and trade-offs that software architects debate daily.',
                category: cat,
                source: domain,
                sourceBadgeText: 'HN',
                sourceBadgeBg: 'bg-orange-500',
                sourceBadgeColor: 'text-white',
                url: s.url,
                publishedAt: formatRelativeTime(new Date(s.time * 1000).toISOString()),
                readTime: '3 min read',
                tags: ['HackerNews', cat.toUpperCase(), 'Engineering'],
                isHot: (s.score || 0) > 180,
                imageUrl: CATEGORY_IMAGES[cat] || CATEGORY_IMAGES.software,
                likesCount: s.score || 140,
                origin: 'hacker-news',
            };
        });
    }
    catch (err) {
        console.warn('[NewsService] Failed to fetch Hacker News:', err?.message);
        return [];
    }
}
// Fetch from NewsAPI.org when NEWS_API_KEY is configured
async function fetchFromNewsApi() {
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_news_api_key')) {
        return [];
    }
    try {
        const url = `https://newsapi.org/v2/top-headlines?category=technology&language=en&pageSize=25&apiKey=${apiKey.trim()}`;
        const res = await fetch(url, {
            headers: { 'User-Agent': 'CampusOrbit-StudyHub/1.0' },
        });
        if (!res.ok) {
            console.warn(`[NewsService] NewsAPI responded with status: ${res.status}`);
            return [];
        }
        const data = (await res.json());
        if (data.status !== 'ok' || !Array.isArray(data.articles)) {
            return [];
        }
        console.log(`[NewsService] Successfully fetched ${data.articles.length} stories from NewsAPI.org`);
        return data.articles
            .filter((art) => art.title && art.title !== '[Removed]' && art.url)
            .map((art, index) => {
            let rawTitle = art.title;
            const source = art.source?.name || 'NewsAPI';
            const dashIdx = rawTitle.lastIndexOf(' - ');
            if (dashIdx > 0) {
                rawTitle = rawTitle.substring(0, dashIdx).trim();
            }
            const titleLower = (art.title + ' ' + (art.description || '')).toLowerCase();
            let cat = 'software';
            if (titleLower.includes('ai') || titleLower.includes('gpt') || titleLower.includes('llm') || titleLower.includes('artificial intelligence') || titleLower.includes('claude')) {
                cat = 'ai';
            }
            else if (titleLower.includes('security') || titleLower.includes('cyber') || titleLower.includes('vulnerability') || titleLower.includes('breach') || titleLower.includes('malware')) {
                cat = 'cyber';
            }
            else if (titleLower.includes('chip') || titleLower.includes('gpu') || titleLower.includes('nvidia') || titleLower.includes('semiconductor') || titleLower.includes('hardware')) {
                cat = 'hardware';
            }
            else if (titleLower.includes('cloud') || titleLower.includes('aws') || titleLower.includes('azure') || titleLower.includes('docker') || titleLower.includes('kubernetes')) {
                cat = 'cloud';
            }
            else if (titleLower.includes('job') || titleLower.includes('hiring') || titleLower.includes('placement') || titleLower.includes('intern') || titleLower.includes('salary')) {
                cat = 'placements';
            }
            const summary = art.description ? cleanHtml(art.description) : rawTitle;
            return {
                id: `newsapi-${index}-${Date.now().toString(36)}`,
                title: rawTitle,
                summary: summary.slice(0, 240) + (summary.length > 240 ? '...' : ''),
                fullContent: [
                    summary,
                    art.content ? cleanHtml(art.content.replace(/\[\+\d+ chars\]/, '')) : '',
                    `Reported by ${source} and served directly via official News API integration. Verified real-time coverage from leading tech newsrooms.`
                ].filter(Boolean),
                keyPoints: [
                    `Top syndicated story reported by ${source}.`,
                    `Directly relevant to ${cat.toUpperCase()} industry movements.`,
                    `Verified live dispatch via NewsAPI.org.`
                ],
                studentTakeaway: `Industry Pulse: Staying aware of headline developments like this helps you discuss modern industry trends in technical rounds and GDs.`,
                category: cat,
                source: source,
                sourceBadgeText: source.slice(0, 3).toUpperCase(),
                sourceBadgeBg: 'bg-blue-600',
                sourceBadgeColor: 'text-white',
                url: art.url,
                publishedAt: formatRelativeTime(art.publishedAt),
                readTime: '3 min read',
                tags: ['NewsAPI', cat.toUpperCase(), 'LiveHeadlines'],
                isHot: index < 3,
                imageUrl: art.urlToImage || CATEGORY_IMAGES[cat] || CATEGORY_IMAGES.software,
                author: art.author || source,
                likesCount: Math.floor(Math.random() * 250) + 120,
                origin: 'news-api',
            };
        });
    }
    catch (err) {
        console.warn('[NewsService] Failed to fetch from NewsAPI:', err?.message);
        return [];
    }
}
// Fetch from GNews.io when GNEWS_API_KEY is configured
async function fetchFromGNews() {
    const apiKey = process.env.GNEWS_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_gnews_api_key')) {
        return [];
    }
    try {
        const url = `https://gnews.io/api/v4/top-headlines?category=technology&lang=en&max=15&apikey=${apiKey.trim()}`;
        const res = await fetch(url);
        if (!res.ok)
            return [];
        const data = (await res.json());
        if (!Array.isArray(data.articles))
            return [];
        return data.articles.map((art, index) => {
            const source = art.source?.name || 'GNews';
            return {
                id: `gnews-${index}-${Date.now().toString(36)}`,
                title: art.title,
                summary: cleanHtml(art.description || art.title),
                fullContent: [cleanHtml(art.description || art.title), cleanHtml(art.content || '')].filter(Boolean),
                keyPoints: [`GNews verified dispatch by ${source}.`],
                studentTakeaway: 'Great real-world case study for engineering discussions and placement interviews.',
                category: 'software',
                source: source,
                sourceBadgeText: source.slice(0, 3).toUpperCase(),
                sourceBadgeBg: 'bg-emerald-600',
                sourceBadgeColor: 'text-white',
                url: art.url,
                publishedAt: formatRelativeTime(art.publishedAt),
                readTime: '3 min read',
                tags: ['GNews', 'TechLive'],
                isHot: index < 2,
                imageUrl: art.image || CATEGORY_IMAGES.software,
                likesCount: Math.floor(Math.random() * 180) + 90,
                origin: 'gnews',
            };
        });
    }
    catch (err) {
        console.warn('[NewsService] Failed to fetch GNews:', err?.message);
        return [];
    }
}
// Fetch all live streams
async function aggregateLiveNews(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && cachedNews.length > 0 && now - lastFetchedAt < CACHE_TTL_MS) {
        return cachedNews;
    }
    console.log('[NewsService] Refreshing live news feeds from external sources...');
    const [newsApiItems, gnewsItems, techFeed, aiFeed, placementsFeed, cyberFeed, devToItems, hnItems] = await Promise.all([
        fetchFromNewsApi(),
        fetchFromGNews(),
        fetchGoogleNewsRSS('https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-IN&gl=IN&ceid=IN:en', 'software', 'Technology'),
        fetchGoogleNewsRSS('https://news.google.com/rss/search?q=Artificial+Intelligence+technology+news&hl=en-IN&gl=IN&ceid=IN:en', 'ai', 'ArtificialIntelligence'),
        fetchGoogleNewsRSS('https://news.google.com/rss/search?q=campus+placements+engineering+hiring+IT+jobs+India&hl=en-IN&gl=IN&ceid=IN:en', 'placements', 'Placements'),
        fetchGoogleNewsRSS('https://news.google.com/rss/search?q=cybersecurity+software+security+advisory&hl=en-IN&gl=IN&ceid=IN:en', 'cyber', 'CyberSecurity'),
        fetchDevToArticles(),
        fetchHackerNewsTop(),
    ]);
    // Combine with NewsAPI items prioritized at top if active
    const seenUrls = new Set();
    const seenTitles = new Set();
    const combined = [];
    const allStream = [
        ...newsApiItems,
        ...gnewsItems,
        ...techFeed,
        ...aiFeed,
        ...placementsFeed,
        ...cyberFeed,
        ...devToItems,
        ...hnItems,
    ];
    for (const item of allStream) {
        const normUrl = item.url.trim().toLowerCase();
        const normTitle = item.title.trim().toLowerCase().slice(0, 40);
        if (!seenUrls.has(normUrl) && !seenTitles.has(normTitle)) {
            seenUrls.add(normUrl);
            seenTitles.add(normTitle);
            combined.push(item);
        }
    }
    if (combined.length > 0) {
        cachedNews = combined;
        lastFetchedAt = now;
        console.log(`[NewsService] Successfully cached ${cachedNews.length} live news stories.`);
    }
    return cachedNews;
}
// GET /api/news
router.get('/', async (req, res) => {
    try {
        const category = req.query.category || 'all';
        const query = (req.query.q || '').trim().toLowerCase();
        const forceRefresh = req.query.refresh === 'true';
        const limit = parseInt(req.query.limit) || 60;
        const allNews = await aggregateLiveNews(forceRefresh);
        let filtered = allNews;
        if (category !== 'all') {
            filtered = filtered.filter((n) => n.category === category);
        }
        if (query) {
            filtered = filtered.filter((n) => {
                return (n.title.toLowerCase().includes(query) ||
                    n.summary.toLowerCase().includes(query) ||
                    n.source.toLowerCase().includes(query) ||
                    n.tags.some((t) => t.toLowerCase().includes(query)));
            });
        }
        const hasApiKey = Boolean(process.env.NEWS_API_KEY || process.env.GNEWS_API_KEY);
        res.json({
            success: true,
            total: filtered.length,
            lastUpdated: new Date(lastFetchedAt).toISOString(),
            isLive: true,
            apiKeyActive: hasApiKey,
            provider: hasApiKey ? (process.env.NEWS_API_KEY ? 'NewsAPI.org' : 'GNews.io') : 'Live Feeds & RSS',
            data: filtered.slice(0, limit),
        });
    }
    catch (error) {
        console.error('[NewsService] Error fetching news:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch live real-time news',
        });
    }
});
// GET /api/news/trending
router.get('/trending', async (_req, res) => {
    try {
        const allNews = await aggregateLiveNews(false);
        const trending = allNews.filter((n) => n.isHot).slice(0, 6);
        res.json({
            success: true,
            total: trending.length,
            data: trending,
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to fetch trending stories' });
    }
});
// POST /api/news/refresh (force refresh)
router.post('/refresh', async (_req, res) => {
    try {
        const refreshed = await aggregateLiveNews(true);
        res.json({
            success: true,
            message: 'News cache successfully refreshed',
            count: refreshed.length,
            lastUpdated: new Date(lastFetchedAt).toISOString(),
        });
    }
    catch (error) {
        res.status(500).json({ success: false, error: 'Failed to refresh news' });
    }
});
export default router;
