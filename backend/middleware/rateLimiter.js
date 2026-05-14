// Rate limiter: 20 AI calls per hour per user (in-memory)
const userCallMap = new Map();

const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_CALLS = 20;

function rateLimiter(req, res, next) {
  const userId = req.user?.id || req.user?.userId || req.ip;
  const now = Date.now();

  if (!userCallMap.has(userId)) {
    userCallMap.set(userId, { count: 1, windowStart: now });
    return next();
  }

  const record = userCallMap.get(userId);

  // Reset window if expired
  if (now - record.windowStart > WINDOW_MS) {
    record.count = 1;
    record.windowStart = now;
    return next();
  }

  if (record.count >= MAX_CALLS) {
    const resetIn = Math.ceil((WINDOW_MS - (now - record.windowStart)) / 1000 / 60);
    return res.status(429).json({
      error: 'AI rate limit exceeded. Maximum 20 AI calls per hour.',
      retry_after_minutes: resetIn
    });
  }

  record.count += 1;
  next();
}

module.exports = rateLimiter;
