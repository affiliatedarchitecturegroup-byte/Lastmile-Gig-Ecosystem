// -------------------------------------------------------------------
// Lastmile Gig Ecosystem - MongoDB Collections Setup
// Phase: P080-P083 | delivery_events, menus, agent_runs, partner_analytics
// -------------------------------------------------------------------

// Connect to the LMG database
const db = db.getSiblingDB('lastmile_gig');

// ============================================================
// P080: Delivery Events Collection
// ============================================================
db.createCollection('delivery_events', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['order_id', 'driver_id', 'event_type', 'timestamp'],
      properties: {
        order_id: { bsonType: 'string', description: 'UUID reference to orders table' },
        driver_id: { bsonType: 'string', description: 'UUID reference to drivers table' },
        partner_id: { bsonType: 'string', description: 'UUID reference to partners table' },
        event_type: {
          enum: [
            'order_placed', 'order_confirmed', 'driver_assigned',
            'driver_en_route_pickup', 'arrived_at_pickup', 'order_picked_up',
            'in_transit', 'arrived_at_delivery', 'delivered',
            'delivery_verified', 'delivery_photo_captured',
            'blockchain_recorded', 'cancelled', 'failed',
          ],
        },
        timestamp: { bsonType: 'date' },
        location: {
          bsonType: 'object',
          properties: {
            type: { enum: ['Point'] },
            coordinates: { bsonType: 'array', items: { bsonType: 'double' } },
          },
        },
        metadata: { bsonType: 'object' },
        delivery_photo_url: { bsonType: 'string' },
        blockchain_tx_hash: { bsonType: 'string' },
        duration_seconds: { bsonType: 'int' },
        distance_km: { bsonType: 'double' },
      },
    },
  },
});

db.delivery_events.createIndex({ order_id: 1, timestamp: 1 });
db.delivery_events.createIndex({ driver_id: 1, timestamp: -1 });
db.delivery_events.createIndex({ partner_id: 1, timestamp: -1 });
db.delivery_events.createIndex({ event_type: 1, timestamp: -1 });
db.delivery_events.createIndex({ location: '2dsphere' });
db.delivery_events.createIndex(
  { timestamp: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60 } // 1 year TTL
);

print('Created delivery_events collection with indexes');

// ============================================================
// P081: Menus Collection
// ============================================================
db.createCollection('menus', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['partner_id', 'restaurant_name', 'categories'],
      properties: {
        partner_id: { bsonType: 'string', description: 'UUID reference to partners table' },
        restaurant_name: { bsonType: 'string' },
        slug: { bsonType: 'string' },
        description: { bsonType: 'string' },
        cuisine_types: { bsonType: 'array', items: { bsonType: 'string' } },
        categories: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            required: ['name', 'items'],
            properties: {
              name: { bsonType: 'string' },
              description: { bsonType: 'string' },
              sort_order: { bsonType: 'int' },
              is_active: { bsonType: 'bool' },
              items: {
                bsonType: 'array',
                items: {
                  bsonType: 'object',
                  required: ['name', 'price_zar'],
                  properties: {
                    name: { bsonType: 'string' },
                    description: { bsonType: 'string' },
                    price_zar: { bsonType: 'double' },
                    image_url: { bsonType: 'string' },
                    is_available: { bsonType: 'bool' },
                    is_popular: { bsonType: 'bool' },
                    allergens: { bsonType: 'array', items: { bsonType: 'string' } },
                    dietary_tags: { bsonType: 'array', items: { bsonType: 'string' } },
                    preparation_time_min: { bsonType: 'int' },
                    modifiers: { bsonType: 'array' },
                  },
                },
              },
            },
          },
        },
        operating_hours: { bsonType: 'object' },
        is_active: { bsonType: 'bool' },
        last_synced_from_sanity: { bsonType: 'date' },
        sanity_restaurant_id: { bsonType: 'string' },
        updated_at: { bsonType: 'date' },
        created_at: { bsonType: 'date' },
      },
    },
  },
});

db.menus.createIndex({ partner_id: 1 }, { unique: true });
db.menus.createIndex({ slug: 1 }, { unique: true });
db.menus.createIndex({ cuisine_types: 1 });
db.menus.createIndex({ is_active: 1 });
db.menus.createIndex(
  { restaurant_name: 'text', 'categories.items.name': 'text', 'categories.items.description': 'text', cuisine_types: 'text' },
  { weights: { restaurant_name: 10, 'categories.items.name': 5, cuisine_types: 3 }, name: 'menu_text_search' }
);

print('Created menus collection with text indexes');

// ============================================================
// P082: Agent Runs Collection
// ============================================================
db.createCollection('agent_runs', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['agent_type', 'status', 'started_at'],
      properties: {
        agent_type: {
          enum: [
            'dispatch_decision', 'fraud_investigation', 'risk_scoring',
            'demand_forecasting', 'route_optimisation', 'menu_extraction',
            'partner_onboarding', 'esg_reporting', 'driver_scoring',
            'claims_processing', 'customer_service',
          ],
        },
        agent_framework: { enum: ['langchain', 'langgraph', 'crewai'] },
        status: { enum: ['running', 'completed', 'failed', 'timeout', 'cancelled'] },
        trigger: { bsonType: 'string' },
        input: { bsonType: 'object' },
        output: { bsonType: 'object' },
        steps: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            properties: {
              step_name: { bsonType: 'string' },
              tool_name: { bsonType: 'string' },
              input: { bsonType: 'object' },
              output: { bsonType: 'object' },
              duration_ms: { bsonType: 'int' },
              token_count: { bsonType: 'int' },
              cost_usd: { bsonType: 'double' },
            },
          },
        },
        hitl_required: { bsonType: 'bool' },
        hitl_decision: { enum: ['approved', 'rejected', 'pending', null] },
        hitl_decided_by: { bsonType: 'string' },
        confidence_score: { bsonType: 'double' },
        total_tokens: { bsonType: 'int' },
        total_cost_usd: { bsonType: 'double' },
        duration_ms: { bsonType: 'int' },
        error_message: { bsonType: 'string' },
        trace_id: { bsonType: 'string' },
        langsmith_run_id: { bsonType: 'string' },
        started_at: { bsonType: 'date' },
        completed_at: { bsonType: 'date' },
        created_at: { bsonType: 'date' },
      },
    },
  },
});

db.agent_runs.createIndex({ agent_type: 1, started_at: -1 });
db.agent_runs.createIndex({ status: 1 });
db.agent_runs.createIndex({ hitl_required: 1, hitl_decision: 1 });
db.agent_runs.createIndex({ trace_id: 1 });
db.agent_runs.createIndex(
  { created_at: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 } // 90 day TTL
);

print('Created agent_runs collection with TTL index');

// ============================================================
// P083: Partner Analytics Collection (Pre-aggregated)
// ============================================================
db.createCollection('partner_analytics');

db.partner_analytics.createIndex({ partner_id: 1, date: 1 }, { unique: true });
db.partner_analytics.createIndex({ date: -1 });

print('Created partner_analytics collection');
print('MongoDB collections setup complete');
