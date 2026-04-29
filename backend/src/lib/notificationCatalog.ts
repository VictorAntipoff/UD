// Single source of truth for every notification event the system sends.
// Both the dispatch sites and the user-facing preferences UI read from here.
//
// To add a new event type:
//   1. Add it to NOTIFICATION_EVENTS below
//   2. At the dispatch site, call userWantsInApp/userWantsTelegram before sending
//   3. The frontend's preferences UI will pick it up automatically via GET /me/notification-preferences

export type NotificationChannel = 'inApp' | 'telegram';

export interface NotificationEvent {
  /** Stable event-type key (matches NotificationSubscription.eventType + Notification.type) */
  eventType: string;
  /** Human-readable title shown in the preferences UI */
  label: string;
  /** Short explanation shown under the label */
  description: string;
  /** Group heading in the preferences UI (e.g. "Drying", "Transfers") */
  group: string;
  /** Default for inApp channel if user has no subscription row yet */
  defaultInApp: boolean;
  /** Default for telegram channel if user has no subscription row yet */
  defaultTelegram: boolean;
}

// Groups intentionally match individual sidebar menu items so the preferences
// UI feels familiar — "Wood Drying" is a single page in the sidebar; events
// related to it live in their own section here too.
export const NOTIFICATION_EVENTS: NotificationEvent[] = [
  // ─── Wood Receipt ───────────────────────────────────────────────────────
  {
    eventType: 'LOT_PENDING_APPROVAL',
    label: 'LOT pending approval',
    description: 'When a wood receipt LOT is awaiting admin approval',
    group: 'Wood Receipt',
    defaultInApp: true,
    defaultTelegram: true,
  },

  // ─── Wood Drying ────────────────────────────────────────────────────────
  {
    eventType: 'DRYING_CREATED',
    label: 'New drying process started',
    description: 'When someone starts a new drying batch',
    group: 'Wood Drying',
    defaultInApp: true,
    defaultTelegram: true,
  },
  {
    eventType: 'DRYING_DELETED',
    label: 'Drying process deleted',
    description: 'When someone deletes a drying batch (stock returns to Not Dried)',
    group: 'Wood Drying',
    defaultInApp: true,
    defaultTelegram: true,
  },
  {
    eventType: 'DRYING_READING_ADDED',
    label: 'New reading added',
    description: 'When a meter reading is added to a drying process',
    group: 'Wood Drying',
    defaultInApp: true,
    defaultTelegram: true,
  },
  {
    eventType: 'DRYING_CLOSE_REQUESTED',
    label: 'Close approval needed',
    description: 'When an operator requests to close a drying process — admins should review',
    group: 'Wood Drying',
    defaultInApp: true,
    defaultTelegram: true,
  },
  {
    eventType: 'DRYING_CLOSE_APPROVED',
    label: 'Drying close approved',
    description: 'When an admin approves your close request',
    group: 'Wood Drying',
    defaultInApp: true,
    defaultTelegram: true,
  },
  {
    eventType: 'DRYING_CLOSE_REJECTED',
    label: 'Drying close rejected',
    description: 'When an admin rejects your close request',
    group: 'Wood Drying',
    defaultInApp: true,
    defaultTelegram: true,
  },
  {
    eventType: 'DRYING_REOPENED',
    label: 'Drying process reopened',
    description: 'When a previously-completed drying process is reopened',
    group: 'Wood Drying',
    defaultInApp: true,
    defaultTelegram: true,
  },

  // ─── Wood Transfer ──────────────────────────────────────────────────────
  {
    eventType: 'TRANSFER_CREATED',
    label: 'Transfer created',
    description: 'When someone creates a new wood transfer',
    group: 'Wood Transfer',
    defaultInApp: true,
    defaultTelegram: true,
  },
  {
    eventType: 'TRANSFER_APPROVED',
    label: 'Transfer approved',
    description: 'When your transfer request is approved',
    group: 'Wood Transfer',
    defaultInApp: true,
    defaultTelegram: true,
  },
  {
    eventType: 'TRANSFER_REJECTED',
    label: 'Transfer rejected',
    description: 'When your transfer request is rejected',
    group: 'Wood Transfer',
    defaultInApp: true,
    defaultTelegram: true,
  },
  {
    eventType: 'TRANSFER_COMPLETED',
    label: 'Transfer completed',
    description: 'When pieces arrive at the destination warehouse',
    group: 'Wood Transfer',
    defaultInApp: true,
    defaultTelegram: true,
  },

  // ─── Stock Adjustment ───────────────────────────────────────────────────
  {
    eventType: 'STOCK_ADJUSTMENT',
    label: 'Stock adjustment',
    description: 'When an admin manually adjusts stock quantities',
    group: 'Stock Adjustment',
    defaultInApp: true,
    defaultTelegram: true,
  },

  // ─── Luku Recharge ──────────────────────────────────────────────────────
  {
    eventType: 'LUKU_RECHARGE_ADDED',
    label: 'New Luku recharge',
    description: 'When someone logs an electricity (Luku) recharge',
    group: 'Luku Recharge',
    defaultInApp: true,
    defaultTelegram: true,
  },
  {
    eventType: 'LUKU_RECHARGE_DELETED',
    label: 'Luku recharge deleted',
    description: 'When someone deletes an existing Luku recharge',
    group: 'Luku Recharge',
    defaultInApp: true,
    defaultTelegram: true,
  },
];

/** Quick lookup map for runtime checks */
export const NOTIFICATION_EVENT_BY_KEY = new Map(
  NOTIFICATION_EVENTS.map((e) => [e.eventType, e])
);

/** Returns the default channel value for an event, or undefined if unknown */
export function getEventDefault(eventType: string, channel: NotificationChannel): boolean | undefined {
  const ev = NOTIFICATION_EVENT_BY_KEY.get(eventType);
  if (!ev) return undefined;
  return channel === 'inApp' ? ev.defaultInApp : ev.defaultTelegram;
}
