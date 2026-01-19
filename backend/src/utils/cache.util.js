const NodeCache = require('node-cache');

// Create cache instance with 10 second TTL
const cache = new NodeCache({ 
  stdTTL: 10, // 10 seconds default
  checkperiod: 15, // Check for expired keys every 15 seconds
  useClones: false // Better performance, but be careful with mutations
});

// Cache keys
const CACHE_KEYS = {
  LEADERBOARD: 'leaderboard',
  ROOM_CAPACITY: 'room_capacity',
  ALL_TEAMS: 'all_teams',
  TEAM_BY_ID: (id) => `team_${id}`,
  ROOM_TEAMS: (room) => `room_teams_${room}`,
};

// Cache middleware
const cacheMiddleware = (key, ttl = 10) => {
  return (req, res, next) => {
    // Generate cache key with query params if needed
    const cacheKey = typeof key === 'function' ? key(req) : key;
    
    const cachedData = cache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }
    
    // Store original json function
    const originalJson = res.json.bind(res);
    
    // Override json function to cache response
    res.json = (data) => {
      cache.set(cacheKey, data, ttl);
      return originalJson(data);
    };
    
    next();
  };
};

// Invalidate cache by key or pattern
const invalidateCache = (keyOrPattern) => {
  if (keyOrPattern.includes('*')) {
    // Pattern matching - invalidate multiple keys
    const keys = cache.keys();
    const pattern = keyOrPattern.replace('*', '.*');
    const regex = new RegExp(pattern);
    keys.filter(key => regex.test(key)).forEach(key => cache.del(key));
  } else {
    // Single key
    cache.del(keyOrPattern);
  }
};

// Clear all cache
const clearCache = () => {
  cache.flushAll();
};

// Get cache stats
const getCacheStats = () => {
  return cache.getStats();
};

module.exports = {
  cache,
  CACHE_KEYS,
  cacheMiddleware,
  invalidateCache,
  clearCache,
  getCacheStats,
};
