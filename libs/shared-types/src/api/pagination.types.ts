/**
 * Pagination query parameter types.
 */

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FilterQuery extends PaginationQuery {
  search?: string;
  status?: string;
  zone?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface DriverFilterQuery extends FilterQuery {
  vehicleType?: string;
  tier?: string;
  minScore?: number;
}

export interface OrderFilterQuery extends FilterQuery {
  partnerId?: string;
  driverId?: string;
  customerId?: string;
  paymentMethod?: string;
}
