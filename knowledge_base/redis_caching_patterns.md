# Redis Distributed Caching Patterns & Invalidation Strategies

## 1. High-Throughput In-Memory Caching (Sub-5ms Latency)
Redis serves memory-resident key-value data structures with sub-millisecond retrieval latencies. For platforms supporting 50,000 concurrent users, Redis offloads 85%-95% of read traffic away from the primary relational database, serving restaurant catalog listings, delivery driver coordinates, and user profile sessions.

## 2. Caching Topology & Multi-AZ Cluster Mode
- **Redis Cluster (Hash Slots)**: Shards dataset across 16,384 hash slots with master-replica failover pairs across multiple Availability Zones.
- **Client-Side Read Multiplexing**: Redis clients execute pipelined batch operations and maintain connection pools to maximize I/O throughput.

## 3. Cache Invalidation & Consistency Patterns
- **Cache-Aside (Lazy Loading)**: Application queries Redis first. On cache miss, it reads from PostgreSQL, populates Redis with an explicit Time-To-Live (TTL), and returns data.
- **Write-Through / Cache Invalidation Races**: Direct synchronous dual-writes to DB and Redis create race conditions under concurrent writes.
- **Change Data Capture (CDC) via Debezium**: Tail PostgreSQL Write-Ahead Logs (WAL) via Debezium and publish update events to Kafka/Redis to invalidate cached records asynchronously and accurately.

## 4. Cache Stampede (Thundering Herd) Protection
When a popular cache key expires (e.g., top restaurant menu during lunch rush), thousands of simultaneous concurrent requests may miss the cache and overwhelm the primary database:
- **Probabilistic Early Expiration (XFetch)**: Recompute and refresh keys in the background before they formally expire.
- **Distributed Mutex Locking (Redlock)**: Ensure only one backend worker fetches from PostgreSQL on a miss while others await cache population.

## 5. Memory Management & Eviction Policies
- **Eviction Strategy**: Configure `volatile-lru` or `allkeys-lru` with explicit memory caps to prevent Out-Of-Memory exceptions.
- **TTL Strategy**: Always assign explicit TTLs (e.g., 5 to 60 minutes) on volatile entities.
