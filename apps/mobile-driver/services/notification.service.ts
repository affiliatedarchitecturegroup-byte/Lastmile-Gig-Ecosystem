/**
 * Push Notification Service - Firebase Cloud Messaging
 *
 * Handles push notification registration, permission requests,
 * and notification display for the driver mobile app.
 *
 * @see docs/specs/15_DRIVER_ECOSYSTEM_SPEC.md - P137
 * @module services/notification.service
 */

/**
 * Notification types for the driver app.
 */
export enum DriverNotificationType {
  NEW_ORDER = 'new_order',
  ORDER_CANCELLED = 'order_cancelled',
  PAYOUT_PROCESSED = 'payout_processed',
  PERFORMANCE_UPDATE = 'performance_update',
  MAINTENANCE_ALERT = 'maintenance_alert',
  ZONE_SURGE = 'zone_surge',
  ACCOUNT_UPDATE = 'account_update',
}

/**
 * Notification payload structure.
 */
export interface DriverNotification {
  id: string;
  type: DriverNotificationType;
  title: string;
  body: string;
  data: Record<string, string>;
  receivedAt: string;
  read: boolean;
}

/**
 * Notification preferences per type.
 */
export interface NotificationPreferences {
  newOrders: boolean;
  payouts: boolean;
  performance: boolean;
  maintenance: boolean;
  zoneSurge: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  newOrders: true,
  payouts: true,
  performance: true,
  maintenance: true,
  zoneSurge: true,
  quietHoursStart: '22:00',
  quietHoursEnd: '06:00',
};

/**
 * Manages push notification lifecycle for the driver app.
 */
export class NotificationService {
  private pushToken: string | null = null;
  private notifications: DriverNotification[] = [];
  private preferences: NotificationPreferences = { ...DEFAULT_PREFERENCES };

  /**
   * Requests push notification permission and registers device token.
   * In production, uses Expo Notifications + Firebase.
   */
  async registerForPushNotifications(): Promise<string | null> {
    try {
      // In production:
      // const { status } = await Notifications.requestPermissionsAsync();
      // if (status !== 'granted') return null;
      // const token = await Notifications.getExpoPushTokenAsync({ projectId: '...' });
      // this.pushToken = token.data;

      // Dev mode:
      this.pushToken = `ExponentPushToken[dev-${Date.now()}]`;
      console.log('Push token registered:', this.pushToken);

      // Register token with backend
      await this.registerTokenWithBackend(this.pushToken);

      return this.pushToken;
    } catch (error) {
      console.error('Failed to register push notifications:', error);
      return null;
    }
  }

  /**
   * Handles an incoming push notification.
   */
  handleNotification(notification: DriverNotification): void {
    // Check quiet hours
    if (this.isInQuietHours() && notification.type !== DriverNotificationType.NEW_ORDER) {
      return;
    }

    // Check preferences
    if (!this.isNotificationEnabled(notification.type)) {
      return;
    }

    this.notifications.unshift(notification);

    // Keep only last 100 notifications
    if (this.notifications.length > 100) {
      this.notifications = this.notifications.slice(0, 100);
    }
  }

  /**
   * Gets unread notification count.
   */
  getUnreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  /**
   * Gets all notifications.
   */
  getNotifications(): DriverNotification[] {
    return [...this.notifications];
  }

  /**
   * Marks a notification as read.
   */
  markAsRead(notificationId: string): void {
    const notification = this.notifications.find((n) => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }

  /**
   * Marks all notifications as read.
   */
  markAllAsRead(): void {
    this.notifications.forEach((n) => { n.read = true; });
  }

  /**
   * Updates notification preferences.
   */
  updatePreferences(prefs: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...prefs };
  }

  /**
   * Gets current preferences.
   */
  getPreferences(): NotificationPreferences {
    return { ...this.preferences };
  }

  // --- Private helpers ---

  private async registerTokenWithBackend(_token: string): Promise<void> {
    // POST /v1/drivers/me/push-token
    // In production: call API to store device token
  }

  private isInQuietHours(): boolean {
    if (!this.preferences.quietHoursStart || !this.preferences.quietHoursEnd) return false;
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 60 + minutes;

    const [startH, startM] = this.preferences.quietHoursStart.split(':').map(Number);
    const [endH, endM] = this.preferences.quietHoursEnd.split(':').map(Number);
    const startTime = startH * 60 + startM;
    const endTime = endH * 60 + endM;

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime < endTime;
    }
    // Overnight quiet hours (e.g., 22:00 - 06:00)
    return currentTime >= startTime || currentTime < endTime;
  }

  private isNotificationEnabled(type: DriverNotificationType): boolean {
    switch (type) {
      case DriverNotificationType.NEW_ORDER: return this.preferences.newOrders;
      case DriverNotificationType.PAYOUT_PROCESSED: return this.preferences.payouts;
      case DriverNotificationType.PERFORMANCE_UPDATE: return this.preferences.performance;
      case DriverNotificationType.MAINTENANCE_ALERT: return this.preferences.maintenance;
      case DriverNotificationType.ZONE_SURGE: return this.preferences.zoneSurge;
      default: return true;
    }
  }
}
