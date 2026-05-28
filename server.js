import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const PORT = Number(process.env.PORT || 5175);
const ROOT = process.cwd();
const LIBRARY_CACHE_FILE = join(ROOT, "data", "library-cache.json");
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml"
};

const nitterInstances = [
  "https://nitter.net",
  "https://nitter.poast.org",
  "https://nitter.privacydev.net",
  "https://nitter.tiekoetter.com"
];

let cachedBearerToken = process.env.X_BEARER_TOKEN || "";
let cachedGuestToken = process.env.X_GUEST_TOKEN || "";
const officialBearerToken = process.env.TWITTER_BEARER_TOKEN || process.env.X_API_BEARER_TOKEN || "";

function send(res, status, body, type = "application/json; charset=utf-8") {
  res.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store"
  });
  res.end(body);
}

function nicheKey(niche) {
  return niche.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "general";
}

async function readLibraryCache() {
  try {
    return JSON.parse(await readFile(LIBRARY_CACHE_FILE, "utf-8"));
  } catch {
    return {};
  }
}

async function writeLibraryCache(cache) {
  await mkdir(join(ROOT, "data"), { recursive: true });
  await writeFile(LIBRARY_CACHE_FILE, JSON.stringify(cache, null, 2));
}

function decodeHtml(value = "") {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&#x27;", "'")
    .replaceAll("\n", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function metricToNumber(value = "") {
  const clean = value.replaceAll(",", "").trim().toLowerCase();
  const match = clean.match(/([\d.]+)\s*([km])?/);
  if (!match) return 0;
  const amount = Number(match[1]);
  const multiplier = match[2] === "m" ? 1_000_000 : match[2] === "k" ? 1_000 : 1;
  return Math.round(amount * multiplier);
}

function formatMetric(value) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1)}K`;
  return String(value);
}

function extractMetric(block, names) {
  for (const name of names) {
    const labelled = block.match(new RegExp(`(?:${name})[^\\d]{0,20}([\\d.,]+\\s*[KkMm]?)`, "i"));
    if (labelled) return metricToNumber(labelled[1]);
  }

  const iconPattern = /icon-(comment|retweet|quote|heart|play)[\s\S]{0,180}?tweet-stat[^>]*>\s*([^<]*)/gi;
  const byIcon = [...block.matchAll(iconPattern)];
  for (const match of byIcon) {
    const [_, icon, value] = match;
    if (names.some((name) => icon.includes(name) || (name === "like" && icon === "heart") || (name === "view" && icon === "play"))) {
      return metricToNumber(value);
    }
  }

  return 0;
}

function parseTweets(html, minLikes) {
  const blocks = html.match(/<div class="timeline-item[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/g) || [];
  return blocks
    .map((block) => {
      const handleMatch = block.match(/class="username"[^>]*>\s*@?([^<\s]+)/i) || block.match(/href="\/([^/"?]+)\/status\/(\d+)"/i);
      const statusMatch = block.match(/href="\/([^/"?]+)\/status\/(\d+)"/i);
      const contentMatch = block.match(/class="tweet-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      if (!handleMatch || !statusMatch || !contentMatch) return null;

      const handle = `@${decodeHtml(handleMatch[1]).replace(/^@/, "")}`;
      const text = decodeHtml(contentMatch[1].replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""));
      const likes = extractMetric(block, ["like", "heart"]);
      const reposts = extractMetric(block, ["retweet"]);
      const replies = extractMetric(block, ["comment", "reply"]);
      const views = extractMetric(block, ["view", "play"]);
      const id = statusMatch[2];
      const username = handle.slice(1);

      return {
        id,
        author: handle,
        profileUrl: `https://x.com/${username}`,
        postUrl: `https://x.com/${username}/status/${id}`,
        text,
        likes,
        reposts,
        replies,
        views,
        score: likes + reposts * 2 + replies * 3 + Math.round(views / 200)
      };
    })
    .filter((tweet) => tweet && tweet.likes >= minLikes && tweet.text.length > 20)
    .sort((a, b) => b.score - a.score);
}

function buildHandles(tweets, options = {}) {
  const minFollowers = options.minFollowers || 0;
  const excludeHandle = options.excludeHandle?.toLowerCase();
  const limit = options.limit || 4;
  const grouped = new Map();
  tweets.forEach((tweet) => {
    if (excludeHandle && tweet.author.toLowerCase() === excludeHandle) return;
    const existing = grouped.get(tweet.author) || {
      handle: tweet.author,
      profileUrl: tweet.profileUrl,
      followers: tweet.followers || 0,
      description: tweet.userDescription || "",
      totalLikes: 0,
      totalReposts: 0,
      totalReplies: 0,
      postCount: 0
    };
    existing.totalLikes += tweet.likes;
    existing.totalReposts += tweet.reposts;
    existing.totalReplies += tweet.replies;
    existing.postCount += 1;
    grouped.set(tweet.author, existing);
  });

  return [...grouped.values()]
    .map((item) => ({
      ...item,
      fit: Math.min(98, 72 + item.postCount * 4 + Math.round(item.totalLikes / 1000)),
      reason: `${item.postCount} matching post${item.postCount === 1 ? "" : "s"} in this niche${item.followers ? ` · ${formatMetric(item.followers)} followers` : ""}`
    }))
    .filter((item) => item.followers >= minFollowers)
    .sort((a, b) => b.fit - a.fit)
    .slice(0, limit);
}

async function getTwitterBearerToken() {
  if (cachedBearerToken) return cachedBearerToken;

  const home = await fetch("https://x.com/", {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" }
  });
  const html = await home.text();
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+client-web[^"]+\.js)"/g)]
    .map((match) => match[1].startsWith("http") ? match[1] : `https://x.com${match[1]}`)
    .slice(0, 12);

  for (const scriptUrl of scripts) {
    try {
      const response = await fetch(scriptUrl, {
        headers: { "User-Agent": "Mozilla/5.0", Accept: "text/javascript" }
      });
      const script = await response.text();
      const match = script.match(/Bearer\s+([A-Za-z0-9%._-]+)/) || script.match(/"(AAAAA[A-Za-z0-9%._-]+)"/);
      if (match) {
        cachedBearerToken = decodeURIComponent(match[1]);
        return cachedBearerToken;
      }
    } catch {
      // Try the next bundle.
    }
  }

  throw new Error("Could not extract X web bearer token");
}

async function getTwitterGuestToken(bearerToken) {
  if (cachedGuestToken) return cachedGuestToken;

  const response = await fetch("https://api.twitter.com/1.1/guest/activate.json", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "User-Agent": "Mozilla/5.0",
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) throw new Error(`guest token ${response.status}`);
  const json = await response.json();
  cachedGuestToken = json.guest_token;
  return cachedGuestToken;
}

function parseTwitterAdaptive(json, minLikes) {
  const tweets = json?.globalObjects?.tweets || {};
  const users = json?.globalObjects?.users || {};

  return Object.values(tweets)
    .map((tweet) => {
      const user = users[tweet.user_id_str];
      if (!user || tweet.retweeted_status_id_str) return null;
      const likes = Number(tweet.favorite_count || 0);
      if (likes < minLikes) return null;
      const username = user.screen_name;
      const views = Number(tweet.ext_views?.count || tweet.views?.count || 0);
      const text = decodeHtml((tweet.full_text || tweet.text || "").replace(/https:\/\/t\.co\/\S+/g, "").trim());

      return {
        id: tweet.id_str,
        author: `@${username}`,
        profileUrl: `https://x.com/${username}`,
        postUrl: `https://x.com/${username}/status/${tweet.id_str}`,
        text,
        likes,
        reposts: Number(tweet.retweet_count || 0),
        replies: Number(tweet.reply_count || 0),
        views,
        score: likes + Number(tweet.retweet_count || 0) * 2 + Number(tweet.reply_count || 0) * 3 + Math.round(views / 200)
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}

async function searchTwitterWeb(query, minLikes) {
  const bearerToken = await getTwitterBearerToken();
  const guestToken = await getTwitterGuestToken(bearerToken);
  const params = new URLSearchParams({
    q: `${query} min_faves:${minLikes} -filter:replies`,
    count: "40",
    tweet_search_mode: "live",
    query_source: "typed_query",
    include_profile_interstitial_type: "1",
    include_blocking: "1",
    include_blocked_by: "1",
    include_followed_by: "1",
    include_want_retweets: "1",
    include_mute_edge: "1",
    include_can_dm: "1",
    include_can_media_tag: "1",
    skip_status: "1",
    cards_platform: "Web-12",
    include_cards: "1",
    include_ext_alt_text: "true",
    include_quote_count: "true",
    include_reply_count: "1",
    tweet_mode: "extended",
    include_ext_views: "true"
  });

  const response = await fetch(`https://api.twitter.com/2/search/adaptive.json?${params}`, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
      "x-guest-token": guestToken,
      "x-twitter-active-user": "yes",
      "x-twitter-client-language": "en",
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json"
    }
  });

  if (!response.ok) throw new Error(`X web search ${response.status}`);
  const json = await response.json();
  const tweets = parseTwitterAdaptive(json, minLikes).slice(0, 8);

  return {
    source: "x.com web search",
    tweets,
    handles: buildHandles(tweets),
    errors: tweets.length ? [] : ["x.com web search returned no posts above the like threshold"]
  };
}

async function searchTwitterOfficial(query, minLikes, options = {}) {
  if (!officialBearerToken) throw new Error("TWITTER_BEARER_TOKEN or X_API_BEARER_TOKEN is not set");

  const tweets = [];
  const seen = new Set();
  let nextToken = "";
  const maxPages = options.maxPages || 4;
  const maxTweets = options.maxTweets || 8;

  for (let page = 0; page < maxPages && tweets.length < maxTweets; page += 1) {
    const params = new URLSearchParams({
      query: `${query} -is:retweet lang:en`,
      max_results: "100",
      "tweet.fields": "public_metrics,created_at,author_id",
      expansions: "author_id",
      "user.fields": "username,name,description,verified,public_metrics,profile_image_url,url"
    });
    if (nextToken) params.set("next_token", nextToken);

    const response = await fetch(`https://api.twitter.com/2/tweets/search/recent?${params}`, {
      headers: {
        Authorization: `Bearer ${officialBearerToken}`,
        "User-Agent": "ViralJarDashboard/1.0",
        Accept: "application/json"
      }
    });

    if (!response.ok) throw new Error(`official X API ${response.status}`);
    const json = await response.json();
    const users = new Map((json.includes?.users || []).map((user) => [user.id, user]));
    (json.data || []).forEach((tweet) => {
      if (seen.has(tweet.id)) return;
      seen.add(tweet.id);
      const user = users.get(tweet.author_id);
      if (!user) return;
      const metrics = tweet.public_metrics || {};
      const likes = Number(metrics.like_count || 0);
      if (likes < minLikes) return;

      tweets.push({
        id: tweet.id,
        author: `@${user.username}`,
        profileUrl: `https://x.com/${user.username}`,
        postUrl: `https://x.com/${user.username}/status/${tweet.id}`,
        text: decodeHtml(tweet.text || ""),
        displayName: user.name || user.username,
        userDescription: user.description || "",
        followers: Number(user.public_metrics?.followers_count || 0),
        likes,
        reposts: Number(metrics.retweet_count || 0),
        replies: Number(metrics.reply_count || 0),
        views: Number(metrics.impression_count || 0),
        score: likes + Number(metrics.retweet_count || 0) * 2 + Number(metrics.reply_count || 0) * 3
      });
    });

    nextToken = json.meta?.next_token || "";
    if (!nextToken) break;
  }

  tweets.sort((a, b) => b.score - a.score);

  return {
    source: "official X API recent search",
    tweets: tweets.slice(0, maxTweets),
    handles: buildHandles(tweets, options.handleOptions),
    errors: tweets.length ? [] : ["official X API returned no posts above the like threshold"]
  };
}

async function lookupTwitterProfile(username) {
  if (!officialBearerToken) throw new Error("TWITTER_BEARER_TOKEN or X_API_BEARER_TOKEN is not set");
  const clean = username.replace(/^@/, "").trim();
  const params = new URLSearchParams({
    "user.fields": "description,public_metrics,profile_image_url,url,verified,created_at"
  });
  const response = await fetch(`https://api.twitter.com/2/users/by/username/${encodeURIComponent(clean)}?${params}`, {
    headers: {
      Authorization: `Bearer ${officialBearerToken}`,
      "User-Agent": "ViralJarDashboard/1.0",
      Accept: "application/json"
    }
  });

  if (!response.ok) throw new Error(`profile lookup ${response.status}`);
  const json = await response.json();
  const user = json.data;
  if (!user) throw new Error("profile not found");

  return {
    id: user.id,
    handle: `@${user.username}`,
    username: user.username,
    name: user.name,
    description: user.description || "",
    profileUrl: `https://x.com/${user.username}`,
    imageUrl: user.profile_image_url || "",
    followers: Number(user.public_metrics?.followers_count || 0),
    following: Number(user.public_metrics?.following_count || 0),
    posts: Number(user.public_metrics?.tweet_count || 0),
    verified: Boolean(user.verified)
  };
}

function profileSearchQuery(profile, niche) {
  if (niche?.trim()) return niche.trim();
  const words = profile.description
    .replace(/https?:\/\/\S+/g, "")
    .split(/\W+/)
    .filter((word) => word.length > 3)
    .slice(0, 4);
  return words.join(" ") || profile.username;
}

async function searchNitter(query, minLikes, debug = false) {
  const encoded = encodeURIComponent(`${query} min_faves:${minLikes}`);
  const errors = [];
  const debugPages = [];

  for (const instance of nitterInstances) {
    const url = `${instance}/search?f=tweets&q=${encoded}`;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 ViralJarDashboard/1.0",
          Accept: "text/html"
        }
      });
      clearTimeout(timeout);

      if (!response.ok) {
        errors.push(`${instance}: ${response.status}`);
        continue;
      }

      const html = await response.text();
      if (debug) debugPages.push({ source: instance, snippet: html.slice(0, 2500) });
      const tweets = parseTweets(html, minLikes).slice(0, 8);
      if (tweets.length) {
        return {
          source: instance,
          tweets,
          handles: buildHandles(tweets),
          errors,
          debugPages
        };
      }
      errors.push(`${instance}: no matching tweets parsed`);
    } catch (error) {
      errors.push(`${instance}: ${error.name === "AbortError" ? "timed out" : error.message}`);
    }
  }

  return { source: null, tweets: [], handles: [], errors, debugPages };
}

async function handleXSearch(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const q = (url.searchParams.get("q") || "").trim();
  const minLikes = Math.max(100, Number(url.searchParams.get("minLikes") || 100));
  const debug = url.searchParams.get("debug") === "1";

  if (!q) {
    send(res, 400, JSON.stringify({ error: "Missing q search parameter" }));
    return;
  }

  let result;
  const errors = [];
  try {
    result = await searchTwitterOfficial(q, minLikes);
  } catch (error) {
    errors.push(`official X API: ${error.message}`);
    try {
      result = await searchTwitterWeb(q, minLikes);
    } catch (webError) {
      errors.push(`x.com web search: ${webError.message}`);
      result = await searchNitter(q, minLikes, debug);
    }
  }
  result.errors = [...errors, ...(result.errors || [])];
  send(res, 200, JSON.stringify({ query: q, minLikes, ...result }));
}

async function handleXProfile(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const username = (url.searchParams.get("username") || "").trim();
  const niche = (url.searchParams.get("niche") || "").trim();

  if (!username) {
    send(res, 400, JSON.stringify({ error: "Missing username search parameter" }));
    return;
  }

  try {
    const profile = await lookupTwitterProfile(username);
    const query = profileSearchQuery(profile, niche);
    const similarSearch = await searchTwitterOfficial(query, 20, {
      maxPages: 6,
      maxTweets: 40,
      handleOptions: {
        minFollowers: 5000,
        excludeHandle: profile.handle,
        limit: 8
      }
    });

    send(res, 200, JSON.stringify({
      profile,
      query,
      source: similarSearch.source,
      similar: similarSearch.handles,
      samplePosts: similarSearch.tweets.slice(0, 6),
      errors: similarSearch.errors
    }));
  } catch (error) {
    send(res, 500, JSON.stringify({ error: error.message }));
  }
}

function toLibraryPost(tweet, index) {
  return {
    id: tweet.id,
    rank: index + 1,
    author: tweet.author,
    profileUrl: tweet.profileUrl,
    postUrl: tweet.postUrl,
    text: tweet.text,
    likes: tweet.likes,
    reposts: tweet.reposts,
    replies: tweet.replies,
    views: tweet.views,
    score: tweet.score,
    followers: tweet.followers || 0,
    structure: tweet.text.includes("\n") ? "multi-line post" : tweet.text.includes("?") ? "question-led post" : "statement-led post"
  };
}

async function refreshLibrary(niche, minLikes = 100) {
  const result = await searchTwitterOfficial(niche, minLikes, {
    maxPages: 8,
    maxTweets: 24
  });
  const posts = result.tweets.map(toLibraryPost);
  return {
    niche,
    source: result.source,
    minLikes,
    updatedAt: new Date().toISOString(),
    nextUpdateAt: new Date(Date.now() + ONE_DAY_MS).toISOString(),
    posts,
    errors: result.errors || []
  };
}

async function handleLibrary(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const niche = (url.searchParams.get("niche") || "AI productivity").trim();
  const minLikes = Math.max(100, Number(url.searchParams.get("minLikes") || 100));
  const force = url.searchParams.get("refresh") === "1";
  const key = nicheKey(niche);
  const cache = await readLibraryCache();
  const cached = cache[key];
  const isFresh = cached?.updatedAt && Date.now() - new Date(cached.updatedAt).getTime() < ONE_DAY_MS;

  if (cached && isFresh && !force) {
    send(res, 200, JSON.stringify({ ...cached, cached: true }));
    return;
  }

  try {
    const library = await refreshLibrary(niche, minLikes);
    cache[key] = library;
    await writeLibraryCache(cache);
    send(res, 200, JSON.stringify({ ...library, cached: false }));
  } catch (error) {
    if (cached) {
      send(res, 200, JSON.stringify({
        ...cached,
        cached: true,
        stale: true,
        errors: [`refresh failed: ${error.message}`, ...(cached.errors || [])]
      }));
      return;
    }
    send(res, 500, JSON.stringify({ niche, posts: [], errors: [error.message] }));
  }
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : url.pathname;
  const cleanPath = normalize(decodeURIComponent(requested)).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(ROOT, cleanPath);

  try {
    const body = await readFile(filePath);
    send(res, 200, body, MIME[extname(filePath)] || "application/octet-stream");
  } catch {
    const body = await readFile(join(ROOT, "index.html"));
    send(res, 200, body, MIME[".html"]);
  }
}

createServer((req, res) => {
  if (req.url?.startsWith("/api/x-search")) {
    handleXSearch(req, res);
    return;
  }
  if (req.url?.startsWith("/api/x-profile")) {
    handleXProfile(req, res);
    return;
  }
  if (req.url?.startsWith("/api/library")) {
    handleLibrary(req, res);
    return;
  }
  serveStatic(req, res);
}).listen(PORT, "::", () => {
  console.log(`Viral Jar running on http://127.0.0.1:${PORT}`);
});
