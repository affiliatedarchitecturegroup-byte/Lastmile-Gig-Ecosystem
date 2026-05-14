/**
 * Partner Order Queue Page
 * @module web-storefronts/app/partner/orders/page
 * @description Live order queue with real-time WebSocket updates
 * @phase P197 - Storefront Partner Order Queue
 */

'use client';

import React, { useCallback } from 'react';

import { NewOrderAlert } from '../../../components/partner/orders/NewOrderAlert';
import { OrderQueueTable } from '../../../components/partner/orders/OrderQueueTable';
import { useOrderQueue } from '../../../hooks/use-order-queue';
import type { PartnerOrderStatus } from '../../../types/partner.types';

/** Filter status options for the order queue */
const STATUS_FILTER_OPTIONS: ReadonlyArray<{
  value: PartnerOrderStatus | '';
  label: string;
}> = [
  { value: '', label: 'All Orders' },
  { value: 'PENDING' as PartnerOrderStatus, label: 'Pending' },
  { value: 'CONFIRMED' as PartnerOrderStatus, label: 'Confirmed' },
  { value: 'PREPARING' as PartnerOrderStatus, label: 'Preparing' },
  { value: 'READY_FOR_PICKUP' as PartnerOrderStatus, label: 'Ready' },
  { value: 'PICKED_UP' as PartnerOrderStatus, label: 'Picked Up' },
  { value: 'DELIVERING' as PartnerOrderStatus, label: 'Delivering' },
];

/** Sort options */
const SORT_OPTIONS: ReadonlyArray<{
  value: 'newest' | 'oldest' | 'total_desc' | 'total_asc';
  label: string;
}> = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'total_desc', label: 'Highest Value' },
  { value: 'total_asc', label: 'Lowest Value' },
];

/**
 * PartnerOrdersPage - Real-time order queue for restaurant partners
 *
 * Features:
 * - WebSocket-powered real-time order updates
 * - New order pop-up alerts with sound notification
 * - One-click order confirmation and ready marking
 * - Filter by status and sort by various criteria
 * - Search by order number, customer name, or item name
 * - Visual urgency indicators for aging orders
 * - Connection status indicator with auto-reconnect
 *
 * Authentication: Requires valid partner JWT token
 * Route: /partner/orders
 */
export default function PartnerOrdersPage(): React.ReactElement {
  // TODO: Replace with actual auth context from Auth0/session
  const partnerId = 'placeholder-partner-id';
  const token = 'placeholder-token';

  const {
    filteredOrders,
    isLoading,
    error,
    isConnected,
    newOrderAlert,
    filters,
    setFilters,
    updateOrderStatus,
    confirmOrder,
    markReady,
    dismissAlert,
    refresh,
  } = useOrderQueue(partnerId, token);

  /** Handle status filter change */
  const handleStatusFilter = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>): void => {
      const value = event.target.value;
      setFilters({
        status: value ? (value as PartnerOrderStatus) : undefined,
      });
    },
    [setFilters],
  );

  /** Handle sort change */
  const handleSortChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>): void => {
      setFilters({
        sortBy: event.target.value as 'newest' | 'oldest' | 'total_desc' | 'total_asc',
      });
    },
    [setFilters],
  );

  /** Handle search input */
  const handleSearch = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setFilters({ searchQuery: event.target.value });
    },
    [setFilters],
  );

  return (
    <div className="lmg-orders-page">
      {/* New order alert overlay */}
      <NewOrderAlert
        order={newOrderAlert}
        onDismiss={dismissAlert}
        onConfirm={confirmOrder}
      />

      {/* Page header */}
      <header className="lmg-orders-page__header">
        <div className="lmg-orders-page__title-group">
          <h1 className="lmg-orders-page__title">Order Queue</h1>
          <span
            className={`lmg-connection-badge ${
              isConnected
                ? 'lmg-connection-badge--live'
                : 'lmg-connection-badge--offline'
            }`}
          >
            {isConnected ? 'Live Updates' : 'Reconnecting...'}
          </span>
        </div>
      </header>

      {/* Error banner */}
      {error ? (
        <div className="lmg-alert lmg-alert--warning" role="alert">
          <span className="lmg-alert__message">{error}</span>
          <button
            type="button"
            className="lmg-btn lmg-btn--sm lmg-btn--outline"
            onClick={refresh}
          >
            Retry
          </button>
        </div>
      ) : null}

      {/* Filters toolbar */}
      <div className="lmg-orders-page__toolbar">
        {/* Search input */}
        <div className="lmg-search-input">
          <span className="lmg-search-input__icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.742 10.344a6.5 6.5 0 10-1.397 1.398h-.001l3.85 3.85a1 1 0 001.415-1.414l-3.85-3.85zm-5.44.156a4.5 4.5 0 110-9 4.5 4.5 0 010 9z" />
            </svg>
          </span>
          <input
            type="search"
            className="lmg-search-input__field"
            placeholder="Search by order #, customer, or item..."
            value={filters.searchQuery ?? ''}
            onChange={handleSearch}
            aria-label="Search orders"
          />
        </div>

        {/* Status filter */}
        <div className="lmg-select-group">
          <label htmlFor="status-filter" className="lmg-select-group__label">
            Status
          </label>
          <select
            id="status-filter"
            className="lmg-select"
            value={filters.status ?? ''}
            onChange={handleStatusFilter}
          >
            {STATUS_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="lmg-select-group">
          <label htmlFor="sort-select" className="lmg-select-group__label">
            Sort By
          </label>
          <select
            id="sort-select"
            className="lmg-select"
            value={filters.sortBy}
            onChange={handleSortChange}
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Refresh button */}
        <button
          type="button"
          className="lmg-btn lmg-btn--outline lmg-btn--sm"
          onClick={refresh}
          disabled={isLoading}
          aria-label="Refresh order queue"
        >
          <span
            className={`lmg-icon lmg-icon--refresh ${
              isLoading ? 'lmg-icon--spin' : ''
            }`}
            aria-hidden="true"
          />
          Refresh
        </button>
      </div>

      {/* Order queue table */}
      <main className="lmg-orders-page__content">
        <OrderQueueTable
          orders={filteredOrders}
          isLoading={isLoading}
          isConnected={isConnected}
          onConfirmOrder={confirmOrder}
          onMarkReady={markReady}
          onUpdateStatus={updateOrderStatus}
        />
      </main>
    </div>
  );
}
