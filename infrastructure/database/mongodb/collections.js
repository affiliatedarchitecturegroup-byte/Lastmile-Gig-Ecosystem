/**
 * MongoDB Atlas Collection Setup
 *
 * Creates collections with indexes for the Lastmile Gig platform.
 * Run against: mongodb://localhost:27017/lastmile_gig (dev)
 *
 * @see docs/specs/07_DATABASE_ARCHITECTURE.md - Section 3
 */

// --- delivery_events ---
db.createCollection('delivery_events');
db.delivery_events.createIndex({ orderId: 1 });
db.delivery_events.createIndex({ eventType: 1 });
db.delivery_events.createIndex({ timestamp: -1 });
db.delivery_events.createIndex({ 'payload.driverId': 1 });
db.delivery_events.createIndex({ 'payload.partnerId': 1 });
db.delivery_events.createIndex({ processed: 1 });

// --- menus ---
db.createCollection('menus');
db.menus.createIndex({ partnerId: 1 }, { unique: true });
db.menus.createIndex({ slug: 1 }, { unique: true });
db.menus.createIndex({ 'categories.items.name': 'text' });
db.menus.createIndex({ lastSyncedAt: -1 });

// --- agent_runs ---
db.createCollection('agent_runs');
db.agent_runs.createIndex({ runId: 1 }, { unique: true });
db.agent_runs.createIndex({ agentType: 1 });
db.agent_runs.createIndex({ status: 1 });
db.agent_runs.createIndex({ startedAt: -1 });
db.agent_runs.createIndex({ hitlRequired: 1 });
// TTL: auto-delete after 90 days
db.agent_runs.createIndex({ completedAt: 1 }, { expireAfterSeconds: 7776000 });

// --- partner_analytics ---
db.createCollection('partner_analytics');
db.partner_analytics.createIndex({ partnerId: 1, date: -1 });
db.partner_analytics.createIndex({ date: -1 });

// --- notifications ---
db.createCollection('notifications');
db.notifications.createIndex({ userId: 1, createdAt: -1 });
db.notifications.createIndex({ channel: 1, status: 1 });
db.notifications.createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000 }); // 30 days

print('MongoDB collections and indexes created successfully.');
