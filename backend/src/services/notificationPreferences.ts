// Per-user notification preferences with sensible defaults.
//
// Contract:
//   - If a user has a NotificationSubscription row for the eventType,
//     respect its inApp/telegram flags exactly.
//   - If no row exists, fall back to NOTIFICATION_EVENTS defaults
//     (currently: everything on for both channels).
//
// This means:
//   - Existing users get notifications by default (no surprise silences after the rollout).
//   - Users opt out by toggling things off in the UI (which creates a subscription row with that flag = false).
//
// Performance: each dispatch site may query for many users at once; we batch
// via getPreferencesForUsers() to avoid N+1.

import crypto from 'node:crypto';
import { prisma } from '../lib/prisma.js';
import {
  NOTIFICATION_EVENTS,
  NOTIFICATION_EVENT_BY_KEY,
  getEventDefault,
  type NotificationChannel,
} from '../lib/notificationCatalog.js';

/**
 * Should we send `eventType` to `userId` via `channel`?
 * Returns true if:
 *   - user has a subscription row with channel=true, OR
 *   - user has no subscription row AND default for that event/channel is true
 */
export async function userWantsChannel(
  userId: string,
  eventType: string,
  channel: NotificationChannel
): Promise<boolean> {
  if (!NOTIFICATION_EVENT_BY_KEY.has(eventType)) {
    // Unknown event — default-on so we don't silently lose notifications
    return true;
  }
  const sub = await prisma.notificationSubscription.findUnique({
    where: { userId_eventType: { userId, eventType } },
    select: { inApp: true, telegram: true },
  });
  if (!sub) {
    return getEventDefault(eventType, channel) ?? true;
  }
  return channel === 'inApp' ? sub.inApp : sub.telegram;
}

/**
 * Strip the actor from a recipient list — UNLESS that user has opted into
 * "notify me about my own actions" (User.notifyOnOwnActions = true).
 * Useful for solo admins who want a paper trail of everything they do.
 */
export async function excludeActorUnlessOptedIn(
  userIds: string[],
  actorUserId: string | null | undefined
): Promise<string[]> {
  if (!actorUserId) return userIds;
  if (!userIds.includes(actorUserId)) return userIds;

  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    select: { notifyOnOwnActions: true },
  });
  if (actor?.notifyOnOwnActions) return userIds;
  return userIds.filter((id) => id !== actorUserId);
}

/**
 * Filter a list of recipient userIds to only those who want the given event/channel.
 * Used by dispatch sites that fan out to many recipients (e.g. "all admins").
 */
export async function filterRecipientsByPreference(
  userIds: string[],
  eventType: string,
  channel: NotificationChannel
): Promise<string[]> {
  if (userIds.length === 0) return [];
  if (!NOTIFICATION_EVENT_BY_KEY.has(eventType)) return userIds;

  const subs = await prisma.notificationSubscription.findMany({
    where: { userId: { in: userIds }, eventType },
    select: { userId: true, inApp: true, telegram: true },
  });
  const subByUser = new Map(subs.map((s) => [s.userId, s]));
  const fallback = getEventDefault(eventType, channel) ?? true;

  return userIds.filter((uid) => {
    const sub = subByUser.get(uid);
    if (!sub) return fallback;
    return channel === 'inApp' ? sub.inApp : sub.telegram;
  });
}

/**
 * Return the current user's preferences, including events they have no row for
 * (rendered as the catalog defaults). Used by GET /api/users/me/notification-preferences.
 */
export async function getUserPreferences(userId: string): Promise<Array<{
  eventType: string;
  label: string;
  description: string;
  group: string;
  inApp: boolean;
  telegram: boolean;
}>> {
  const subs = await prisma.notificationSubscription.findMany({
    where: { userId },
    select: { eventType: true, inApp: true, telegram: true },
  });
  const subByEvent = new Map(subs.map((s) => [s.eventType, s]));

  return NOTIFICATION_EVENTS.map((ev) => {
    const sub = subByEvent.get(ev.eventType);
    return {
      eventType: ev.eventType,
      label: ev.label,
      description: ev.description,
      group: ev.group,
      inApp: sub ? sub.inApp : ev.defaultInApp,
      telegram: sub ? sub.telegram : ev.defaultTelegram,
    };
  });
}

/**
 * Set a single channel preference for a user/event. Creates the subscription
 * row if it doesn't exist.
 */
export async function setUserPreference(
  userId: string,
  eventType: string,
  patch: Partial<{ inApp: boolean; telegram: boolean }>
): Promise<{ inApp: boolean; telegram: boolean }> {
  if (!NOTIFICATION_EVENT_BY_KEY.has(eventType)) {
    throw new Error(`Unknown eventType: ${eventType}`);
  }
  const event = NOTIFICATION_EVENT_BY_KEY.get(eventType)!;
  const inApp = patch.inApp ?? event.defaultInApp;
  const telegram = patch.telegram ?? event.defaultTelegram;

  const result = await prisma.notificationSubscription.upsert({
    where: { userId_eventType: { userId, eventType } },
    create: {
      id: crypto.randomUUID(),
      userId,
      eventType,
      inApp,
      telegram,
      email: false,
      updatedAt: new Date(),
    },
    update: {
      ...(patch.inApp !== undefined ? { inApp: patch.inApp } : {}),
      ...(patch.telegram !== undefined ? { telegram: patch.telegram } : {}),
      updatedAt: new Date(),
    },
    select: { inApp: true, telegram: true },
  });
  return result;
}
