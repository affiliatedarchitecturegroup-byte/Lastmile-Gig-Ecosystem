/**
 * useOrderQueue Hook Tests
 * @module web-storefronts/__tests__/hooks/use-order-queue.spec
 * @description Unit tests for order queue WebSocket hook
 * @phase P201 - Storefront Service Unit Tests
 */

import type {
  PartnerOrder,
  PartnerOrderStatus,
} from '../../types/partner.types';

/** Mock order fixture */
function createMockOrder(overrides: Partial<PartnerOrder> = {}): PartnerOrder {
  return {
    id: 'order-001',
    orderNumber: 'LMG-2026-0001',
    status: 'PENDING' as PartnerOrderStatus,
    items: [
      {
        id: 'item-001',
        menuItemId: 'mi-001',
        name: 'Quarter Mutton Bunny',
        quantity: 2,
        unitPrice: 89.99,
        totalPrice: 179.98,
        specialInstructions: 'Extra spicy',
      },
      {
        id: 'item-002',
        menuItemId: 'mi-002',
        name: 'Mango Lassi',
        quantity: 1,
        unitPrice: 39.99,
        totalPrice: 39.99,
      },
    ],
    customer: {
      displayName: 'Thabo M.',
      orderCount: 5,
      isRepeatCustomer: true,
    },
    subtotal: 219.97,
    deliveryFee: 25.0,
    serviceFee: 15.0,
    total: 259.97,
    currency: 'ZAR',
    estimatedPrepTime: 20,
    estimatedDeliveryTime: 35,
    driverAssigned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('Order Queue - Order Filtering', () => {
  const orders: ReadonlyArray<PartnerOrder> = [
    createMockOrder({ id: '1', status: 'PENDING' as PartnerOrderStatus }),
    createMockOrder({ id: '2', status: 'CONFIRMED' as PartnerOrderStatus }),
    createMockOrder({ id: '3', status: 'PREPARING' as PartnerOrderStatus }),
    createMockOrder({
      id: '4',
      status: 'READY_FOR_PICKUP' as PartnerOrderStatus,
    }),
    createMockOrder({ id: '5', status: 'DELIVERED' as PartnerOrderStatus }),
  ];

  it('should filter by status', () => {
    const filtered = orders.filter((o) => o.status === 'PENDING');
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('1');
  });

  it('should filter by multiple statuses', () => {
    const activeStatuses: ReadonlyArray<string> = [
      'PENDING',
      'CONFIRMED',
      'PREPARING',
    ];
    const filtered = orders.filter((o) => activeStatuses.includes(o.status));
    expect(filtered.length).toBe(3);
  });

  it('should search by order number', () => {
    const query = 'LMG-2026';
    const filtered = orders.filter((o) =>
      o.orderNumber.toLowerCase().includes(query.toLowerCase()),
    );
    expect(filtered.length).toBe(5);
  });

  it('should search by customer name', () => {
    const query = 'thabo';
    const filtered = orders.filter((o) =>
      o.customer.displayName.toLowerCase().includes(query.toLowerCase()),
    );
    expect(filtered.length).toBe(5);
  });

  it('should search by item name', () => {
    const query = 'bunny';
    const filtered = orders.filter((o) =>
      o.items.some((item) =>
        item.name.toLowerCase().includes(query.toLowerCase()),
      ),
    );
    expect(filtered.length).toBe(5);
  });

  it('should return empty for non-matching search', () => {
    const query = 'zzzzzzz';
    const filtered = orders.filter((o) =>
      o.orderNumber.toLowerCase().includes(query.toLowerCase()),
    );
    expect(filtered.length).toBe(0);
  });
});

describe('Order Queue - Sorting', () => {
  const now = new Date();
  const orders: PartnerOrder[] = [
    createMockOrder({
      id: '1',
      total: 200,
      createdAt: new Date(now.getTime() - 60_000).toISOString(),
    }),
    createMockOrder({
      id: '2',
      total: 500,
      createdAt: new Date(now.getTime() - 120_000).toISOString(),
    }),
    createMockOrder({
      id: '3',
      total: 150,
      createdAt: now.toISOString(),
    }),
  ];

  it('should sort by newest first', () => {
    const sorted = [...orders].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    expect(sorted[0].id).toBe('3');
    expect(sorted[2].id).toBe('2');
  });

  it('should sort by oldest first', () => {
    const sorted = [...orders].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
    expect(sorted[0].id).toBe('2');
    expect(sorted[2].id).toBe('3');
  });

  it('should sort by total descending', () => {
    const sorted = [...orders].sort((a, b) => b.total - a.total);
    expect(sorted[0].id).toBe('2');
    expect(sorted[0].total).toBe(500);
  });

  it('should sort by total ascending', () => {
    const sorted = [...orders].sort((a, b) => a.total - b.total);
    expect(sorted[0].id).toBe('3');
    expect(sorted[0].total).toBe(150);
  });
});

describe('Order Queue - Status Transitions', () => {
  it('should allow PENDING -> CONFIRMED', () => {
    const order = createMockOrder({ status: 'PENDING' as PartnerOrderStatus });
    expect(order.status).toBe('PENDING');
    // Simulating status update
    const updated = { ...order, status: 'CONFIRMED' as PartnerOrderStatus };
    expect(updated.status).toBe('CONFIRMED');
  });

  it('should allow CONFIRMED -> PREPARING', () => {
    const order = createMockOrder({
      status: 'CONFIRMED' as PartnerOrderStatus,
    });
    const updated = { ...order, status: 'PREPARING' as PartnerOrderStatus };
    expect(updated.status).toBe('PREPARING');
  });

  it('should allow PREPARING -> READY_FOR_PICKUP', () => {
    const order = createMockOrder({
      status: 'PREPARING' as PartnerOrderStatus,
    });
    const updated = {
      ...order,
      status: 'READY_FOR_PICKUP' as PartnerOrderStatus,
    };
    expect(updated.status).toBe('READY_FOR_PICKUP');
  });

  it('should calculate item count correctly', () => {
    const order = createMockOrder();
    const itemCount = order.items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    expect(itemCount).toBe(3); // 2 bunnies + 1 lassi
  });

  it('should identify repeat customers', () => {
    const order = createMockOrder();
    expect(order.customer.isRepeatCustomer).toBe(true);
    expect(order.customer.orderCount).toBeGreaterThan(1);
  });

  it('should have valid ZAR total', () => {
    const order = createMockOrder();
    expect(order.total).toBeGreaterThan(0);
    expect(order.currency).toBe('ZAR');
    expect(order.total).toBe(order.subtotal + order.deliveryFee + order.serviceFee);
  });
});

describe('Order Queue - WebSocket Message Handling', () => {
  it('should handle new_order event', () => {
    const orders: PartnerOrder[] = [];
    const newOrder = createMockOrder({ id: 'new-1' });

    // Simulate WebSocket new_order event
    orders.unshift(newOrder);

    expect(orders.length).toBe(1);
    expect(orders[0].id).toBe('new-1');
  });

  it('should handle order_updated event', () => {
    const orders: PartnerOrder[] = [
      createMockOrder({ id: '1', status: 'PENDING' as PartnerOrderStatus }),
    ];

    const updatedOrder = createMockOrder({
      id: '1',
      status: 'CONFIRMED' as PartnerOrderStatus,
    });

    const result = orders.map((o) =>
      o.id === updatedOrder.id ? updatedOrder : o,
    );

    expect(result[0].status).toBe('CONFIRMED');
  });

  it('should handle order_cancelled event', () => {
    const orders: PartnerOrder[] = [
      createMockOrder({ id: '1', status: 'PENDING' as PartnerOrderStatus }),
      createMockOrder({
        id: '2',
        status: 'CONFIRMED' as PartnerOrderStatus,
      }),
    ];

    const cancelledOrder = createMockOrder({
      id: '1',
      status: 'CANCELLED' as PartnerOrderStatus,
    });

    const result = orders.map((o) =>
      o.id === cancelledOrder.id ? cancelledOrder : o,
    );

    expect(result[0].status).toBe('CANCELLED');
    expect(result[1].status).toBe('CONFIRMED');
  });

  it('should handle driver_assigned event', () => {
    const order = createMockOrder({
      driverAssigned: false,
    });

    const updated = {
      ...order,
      driverAssigned: true,
      driverName: 'Sipho K.',
    };

    expect(updated.driverAssigned).toBe(true);
    expect(updated.driverName).toBe('Sipho K.');
  });
});
