package ie.noelmccarthy.xrmobilitycoach.api.ratelimit;

import java.time.Clock;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

/** Simple in-memory sliding-window limiter for single-instance deployments. */
public class InMemoryRateLimitService {

    private final ConcurrentHashMap<String, SlidingWindowCounter> counters = new ConcurrentHashMap<>();
    private final Clock clock;

    public InMemoryRateLimitService(Clock clock) {
        this.clock = clock;
    }

    public void check(String key,
                      int maxRequests,
                      Duration window,
                      String message,
                      long retryAfterSeconds) {
        // Invalid or disabled limits are treated as no-op so config can turn a rule off cleanly.
        if (maxRequests < 1 || window.isZero() || window.isNegative()) {
            return;
        }

        SlidingWindowCounter counter = counters.computeIfAbsent(key, ignored -> new SlidingWindowCounter());
        if (!counter.tryAcquire(clock.millis(), maxRequests, window.toMillis())) {
            throw new RateLimitExceededException(message, retryAfterSeconds);
        }
    }

    public void clear() {
        counters.clear();
    }

    private static final class SlidingWindowCounter {

        private final Deque<Long> requestTimestamps = new ArrayDeque<>();

        synchronized boolean tryAcquire(long nowMillis, int maxRequests, long windowMillis) {
            // Drop timestamps that have fallen out of the active window before checking the current request.
            long cutoff = nowMillis - windowMillis;
            while (!requestTimestamps.isEmpty() && requestTimestamps.peekFirst() <= cutoff) {
                requestTimestamps.removeFirst();
            }

            if (requestTimestamps.size() >= maxRequests) {
                return false;
            }

            requestTimestamps.addLast(nowMillis);
            return true;
        }
    }
}
