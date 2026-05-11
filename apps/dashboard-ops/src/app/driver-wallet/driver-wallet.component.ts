/**
 * Driver Wallet Dashboard Component (Angular 17)
 *
 * Earnings dashboard with charts showing daily/weekly/monthly trends,
 * commission breakdown, and payout history. Used by ops and drivers.
 *
 * @see docs/specs/15_DRIVER_ECOSYSTEM_SPEC.md - P128
 * @see POLYGLOT_ARCHITECTURE.md - Section 3.2 (Angular 17 for Ops)
 */

import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

interface WalletSummary {
  driverId: string;
  driverName: string;
  currentBalance: number;
  pendingEarnings: number;
  thisWeekEarnings: number;
  thisMonthEarnings: number;
  lifetimeEarnings: number;
  commissionRate: number;
  tier: string;
  payoutPreference: string;
  nextScheduledPayout: string;
}

interface EarningsEntry {
  date: string;
  deliveries: number;
  grossEarnings: number;
  commission: number;
  netEarnings: number;
  tips: number;
  bonuses: number;
}

interface PayoutRecord {
  id: string;
  amount: number;
  method: string;
  status: string;
  initiatedAt: string;
  completedAt: string | null;
  reference: string;
}

@Component({
  selector: 'lmg-driver-wallet',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="wallet-dashboard">
      <header class="wallet-header">
        <h1>Driver Earnings Dashboard</h1>
        <div class="period-selector">
          <button
            *ngFor="let p of periods"
            [class.active]="selectedPeriod() === p"
            (click)="selectPeriod(p)"
          >{{ p | titlecase }}</button>
        </div>
      </header>

      <!-- Summary Cards -->
      <div class="summary-grid" *ngIf="wallet() as w">
        <div class="summary-card balance">
          <span class="label">Available Balance</span>
          <span class="amount">R {{ w.currentBalance | number:'1.2-2' }}</span>
          <span class="sub">+ R {{ w.pendingEarnings | number:'1.2-2' }} pending</span>
        </div>
        <div class="summary-card earnings">
          <span class="label">{{ selectedPeriod() | titlecase }} Earnings</span>
          <span class="amount">R {{ periodEarnings() | number:'1.2-2' }}</span>
        </div>
        <div class="summary-card tier">
          <span class="label">Performance Tier</span>
          <span class="tier-badge" [attr.data-tier]="w.tier">{{ w.tier }}</span>
          <span class="sub">Commission: {{ (w.commissionRate * 100) | number:'1.0-0' }}%</span>
        </div>
        <div class="summary-card payout">
          <span class="label">Next Payout</span>
          <span class="amount">{{ w.nextScheduledPayout | date:'mediumDate' }}</span>
          <button class="instant-payout-btn" (click)="requestInstantPayout()">
            Instant Payout (Ozow)
          </button>
        </div>
      </div>

      <!-- Earnings Table -->
      <section class="earnings-section">
        <h2>Daily Breakdown</h2>
        <table class="earnings-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Deliveries</th>
              <th>Gross</th>
              <th>Commission</th>
              <th>Tips</th>
              <th>Bonuses</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let entry of earningsHistory()">
              <td>{{ entry.date | date:'shortDate' }}</td>
              <td>{{ entry.deliveries }}</td>
              <td>R {{ entry.grossEarnings | number:'1.2-2' }}</td>
              <td class="negative">-R {{ entry.commission | number:'1.2-2' }}</td>
              <td>R {{ entry.tips | number:'1.2-2' }}</td>
              <td>R {{ entry.bonuses | number:'1.2-2' }}</td>
              <td class="net">R {{ entry.netEarnings | number:'1.2-2' }}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <!-- Payout History -->
      <section class="payout-section">
        <h2>Payout History</h2>
        <div class="payout-list">
          <div class="payout-item" *ngFor="let payout of payouts()">
            <div class="payout-info">
              <span class="payout-amount">R {{ payout.amount | number:'1.2-2' }}</span>
              <span class="payout-method">{{ payout.method }}</span>
            </div>
            <div class="payout-meta">
              <span class="payout-status" [attr.data-status]="payout.status">
                {{ payout.status }}
              </span>
              <span class="payout-date">{{ payout.initiatedAt | date:'medium' }}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .wallet-dashboard { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .wallet-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .wallet-header h1 { font-size: 24px; font-weight: 700; color: #1a1a2e; }
    .period-selector { display: flex; gap: 8px; }
    .period-selector button {
      padding: 8px 16px; border: 1px solid #e2e8f0; border-radius: 8px;
      background: white; cursor: pointer; font-weight: 500;
    }
    .period-selector button.active { background: #0066ff; color: white; border-color: #0066ff; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
    .summary-card {
      background: white; border-radius: 12px; padding: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .summary-card .label { display: block; font-size: 13px; color: #64748b; margin-bottom: 4px; }
    .summary-card .amount { display: block; font-size: 28px; font-weight: 700; color: #1a1a2e; }
    .summary-card .sub { display: block; font-size: 12px; color: #64748b; margin-top: 4px; }
    .summary-card.balance { border-left: 4px solid #0066ff; }
    .summary-card.earnings { border-left: 4px solid #10b981; }
    .summary-card.tier { border-left: 4px solid #f59e0b; }
    .summary-card.payout { border-left: 4px solid #8b5cf6; }
    .tier-badge {
      display: inline-block; padding: 4px 12px; border-radius: 12px;
      font-weight: 600; font-size: 14px; background: #fcd34d; color: #1a1a2e;
    }
    .instant-payout-btn {
      margin-top: 8px; padding: 8px 16px; background: #8b5cf6; color: white;
      border: none; border-radius: 8px; cursor: pointer; font-weight: 600; width: 100%;
    }
    .earnings-table { width: 100%; border-collapse: collapse; background: white; border-radius: 12px; overflow: hidden; }
    .earnings-table th { background: #f8fafc; padding: 12px; text-align: left; font-size: 13px; color: #64748b; }
    .earnings-table td { padding: 12px; border-top: 1px solid #e2e8f0; font-size: 14px; }
    .negative { color: #dc2626; }
    .net { font-weight: 600; color: #10b981; }
    .payout-list { display: flex; flex-direction: column; gap: 8px; }
    .payout-item {
      display: flex; justify-content: space-between; padding: 16px;
      background: white; border-radius: 8px;
    }
    .payout-amount { font-size: 18px; font-weight: 600; }
    .payout-method { display: block; font-size: 13px; color: #64748b; }
    .payout-status { padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .payout-status[data-status="completed"] { background: #d1fae5; color: #065f46; }
    .payout-status[data-status="pending"] { background: #fef3c7; color: #92400e; }
    .payout-date { display: block; font-size: 12px; color: #64748b; margin-top: 4px; }
    .earnings-section, .payout-section { margin-bottom: 32px; }
    .earnings-section h2, .payout-section h2 { font-size: 18px; margin-bottom: 16px; }
  `],
})
export class DriverWalletComponent implements OnInit {
  readonly periods = ['week', 'month', 'lifetime'] as const;
  readonly selectedPeriod = signal<string>('week');

  readonly wallet = signal<WalletSummary | null>(null);
  readonly earningsHistory = signal<EarningsEntry[]>([]);
  readonly payouts = signal<PayoutRecord[]>([]);

  readonly periodEarnings = computed(() => {
    const w = this.wallet();
    if (!w) return 0;
    switch (this.selectedPeriod()) {
      case 'week': return w.thisWeekEarnings;
      case 'month': return w.thisMonthEarnings;
      case 'lifetime': return w.lifetimeEarnings;
      default: return w.thisWeekEarnings;
    }
  });

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.loadWalletData();
  }

  selectPeriod(period: string): void {
    this.selectedPeriod.set(period);
  }

  requestInstantPayout(): void {
    // POST /v1/drivers/:id/wallet/payout - Ozow instant EFT
    console.warn('Instant payout requested - integration pending');
  }

  private loadWalletData(): void {
    // Dev mode: mock data
    this.wallet.set({
      driverId: 'driver-uuid-123',
      driverName: 'Sipho Ndlovu',
      currentBalance: 1245.50,
      pendingEarnings: 380.00,
      thisWeekEarnings: 3245.00,
      thisMonthEarnings: 12450.00,
      lifetimeEarnings: 87350.00,
      commissionRate: 0.15,
      tier: 'Gold',
      payoutPreference: 'ozow',
      nextScheduledPayout: '2026-05-13',
    });

    this.earningsHistory.set([
      { date: '2026-05-11', deliveries: 12, grossEarnings: 580, commission: 87, netEarnings: 493, tips: 45, bonuses: 0 },
      { date: '2026-05-10', deliveries: 15, grossEarnings: 720, commission: 108, netEarnings: 612, tips: 60, bonuses: 100 },
      { date: '2026-05-09', deliveries: 10, grossEarnings: 485, commission: 72.75, netEarnings: 412.25, tips: 30, bonuses: 0 },
    ]);

    this.payouts.set([
      { id: 'p1', amount: 2500, method: 'Ozow Instant EFT', status: 'completed', initiatedAt: '2026-05-10T18:00:00Z', completedAt: '2026-05-10T18:02:00Z', reference: 'OZW-1234' },
      { id: 'p2', amount: 3200, method: 'Scheduled Payout', status: 'completed', initiatedAt: '2026-05-06T00:00:00Z', completedAt: '2026-05-07T10:00:00Z', reference: 'SCH-5678' },
    ]);
  }
}
