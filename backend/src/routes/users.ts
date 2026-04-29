import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import {
  sendTelegramMessageToChatId,
  formatWelcomeMessage,
  isTelegramConfigured,
} from '../services/telegramNotify.js';
import {
  pendingLinkCodes,
  userActiveLinkCode,
  generateLinkCode,
  pruneExpiredLinkCodes,
  LINK_CODE_TTL_MS,
  type PendingLinkCode,
} from '../lib/telegramLinkStore.js';
import {
  getUserPreferences,
  setUserPreference,
} from '../services/notificationPreferences.js';

async function usersRoutes(fastify: FastifyInstance) {
  // SECURITY: Protect all user routes with authentication
  fastify.addHook('onRequest', authenticateToken);

  fastify.get('/', async (request, reply) => {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          failedLoginAttempts: true,
          accountLockedAt: true,
          lastFailedLoginAt: true,
          permissions: true,
          createdAt: true,
          updatedAt: true
        }
      });
      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      return reply.status(500).send({ error: 'Failed to fetch users' });
    }
  });

  // SECURITY: Create user (Admin only)
  fastify.post('/', async (request, reply) => {
    try {
      const createData = request.body as any;

      // Check if requester is admin
      const requestUser = (request as any).user;
      if (requestUser.role !== 'ADMIN') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Only administrators can create users'
        });
      }

      // Validate required fields
      if (!createData.email || !createData.password) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Email and password are required'
        });
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: createData.email }
      });

      if (existingUser) {
        return reply.status(409).send({
          error: 'Conflict',
          message: 'User with this email already exists'
        });
      }

      // Hash password
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(createData.password, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: createData.email,
          password: hashedPassword,
          firstName: createData.firstName || null,
          lastName: createData.lastName || null,
          role: createData.role || 'USER',
          isActive: createData.isActive !== undefined ? createData.isActive : true,
          permissions: createData.permissions || null
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          permissions: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return {
        success: true,
        message: 'User created successfully',
        user
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return reply.status(500).send({ error: 'Failed to create user' });
    }
  });

  // Update own profile (any authenticated user)
  fastify.put('/profile', async (request, reply) => {
    try {
      const updateData = request.body as any;
      const requestUser = (request as any).user;

      // Prepare update data (only allow certain fields)
      const data: any = {};
      if (updateData.firstName !== undefined) data.firstName = updateData.firstName;
      if (updateData.lastName !== undefined) data.lastName = updateData.lastName;

      // Update password if provided and current password is correct
      if (updateData.newPassword && updateData.currentPassword) {
        const user = await prisma.user.findUnique({
          where: { id: requestUser.userId }
        });

        if (!user) {
          return reply.status(404).send({ error: 'User not found' });
        }

        // Verify current password
        const bcrypt = await import('bcryptjs');
        const validPassword = await bcrypt.compare(updateData.currentPassword, user.password);

        if (!validPassword) {
          return reply.status(400).send({ error: 'Current password is incorrect' });
        }

        // Hash new password
        data.password = await bcrypt.hash(updateData.newPassword, 10);
      }

      const user = await prisma.user.update({
        where: { id: requestUser.userId },
        data,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          permissions: true,
          createdAt: true,
          updatedAt: true
        }
      });

      return {
        success: true,
        message: 'Profile updated successfully',
        user
      };
    } catch (error) {
      console.error('Error updating profile:', error);
      return reply.status(500).send({ error: 'Failed to update profile' });
    }
  });

  // SECURITY: Update user (Admin only)
  fastify.put('/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as { userId: string };
      const updateData = request.body as any;

      console.log('PUT /users/:userId called');
      console.log('User ID:', userId);
      console.log('Update data:', JSON.stringify(updateData, null, 2));

      // Check if requester is admin
      const requestUser = (request as any).user;
      if (requestUser.role !== 'ADMIN') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Only administrators can update users'
        });
      }

      // Prepare update data
      const data: any = {};
      if (updateData.email) data.email = updateData.email;
      if (updateData.firstName !== undefined) data.firstName = updateData.firstName;
      if (updateData.lastName !== undefined) data.lastName = updateData.lastName;
      if (updateData.role) data.role = updateData.role;
      if (updateData.isActive !== undefined) data.isActive = updateData.isActive;
      if (updateData.permissions) data.permissions = updateData.permissions;

      console.log('Prepared data for update:', JSON.stringify(data, null, 2));

      // Update password if provided
      if (updateData.password) {
        const bcrypt = await import('bcryptjs');
        data.password = await bcrypt.hash(updateData.password, 10);
      }

      const user = await prisma.user.update({
        where: { id: userId },
        data,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          permissions: true,
          createdAt: true,
          updatedAt: true
        }
      });

      console.log('User updated successfully:', JSON.stringify(user, null, 2));

      return {
        success: true,
        message: 'User updated successfully',
        user
      };
    } catch (error) {
      console.error('Error updating user:', error);
      return reply.status(500).send({ error: 'Failed to update user' });
    }
  });

  // SECURITY: Unlock user account (Admin only)
  fastify.post('/unlock/:userId', async (request, reply) => {
    try {
      const { userId } = request.params as { userId: string };

      // Check if requester is admin
      const requestUser = (request as any).user;
      if (requestUser.role !== 'ADMIN') {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Only administrators can unlock user accounts'
        });
      }

      // Unlock the user account
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          failedLoginAttempts: 0,
          accountLockedAt: null,
          lastFailedLoginAt: null
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          failedLoginAttempts: true,
          accountLockedAt: true
        }
      });

      return {
        success: true,
        message: 'Account unlocked successfully',
        user
      };
    } catch (error) {
      console.error('Error unlocking user account:', error);
      return reply.status(500).send({ error: 'Failed to unlock user account' });
    }
  });

  // ===== TELEGRAM LINK ENDPOINTS =====
  // The current user manages their own Telegram link. Admins manage other users'
  // links through the existing PUT /:userId endpoint (extended below would be
  // separate work; out of scope for this batch).

  // GET /me/telegram — read current link status of the calling user.
  fastify.get('/me/telegram', async (request, reply) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) return reply.status(401).send({ error: 'Not authenticated' });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          telegramChatId: true,
          telegramLinkedAt: true,
        },
      });
      if (!user) return reply.status(404).send({ error: 'User not found' });

      return {
        linked: Boolean(user.telegramChatId),
        chatId: user.telegramChatId,
        linkedAt: user.telegramLinkedAt,
        botUsername: 'ud_system_bot',
        configured: isTelegramConfigured(),
      };
    } catch (error: any) {
      console.error('Error fetching telegram link:', error);
      return reply.status(500).send({ error: 'Failed to fetch telegram link' });
    }
  });

  // PUT /me/telegram — set or clear the calling user's chat ID.
  // Body: { chatId: string | null }
  fastify.put('/me/telegram', async (request, reply) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) return reply.status(401).send({ error: 'Not authenticated' });
      const { chatId } = (request.body as { chatId?: string | null } | null) ?? {};

      // null/empty => unlink
      if (chatId === null || chatId === '' || chatId === undefined) {
        const updated = await prisma.user.update({
          where: { id: userId },
          data: { telegramChatId: null, telegramLinkedAt: null },
          select: { id: true, telegramChatId: true, telegramLinkedAt: true },
        });
        return { linked: false, chatId: null, linkedAt: null };
      }

      // Validate format: Telegram chat IDs are numeric (sometimes negative for groups)
      const trimmed = String(chatId).trim();
      if (!/^-?\d+$/.test(trimmed)) {
        return reply.status(400).send({
          error: 'chatId must be a numeric Telegram chat ID. Send any message to @ud_system_bot to discover yours.',
        });
      }

      // Detect "already linked to a different user" (the partial unique index would
      // catch this anyway, but a clear API error is friendlier than a 500).
      const existing = await prisma.user.findFirst({
        where: { telegramChatId: trimmed, NOT: { id: userId } },
        select: { id: true, email: true },
      });
      if (existing) {
        return reply.status(400).send({
          error: 'This Telegram chat is already linked to another user account. Each chat can be linked to one user only.',
        });
      }

      try {
        const updated = await prisma.user.update({
          where: { id: userId },
          data: {
            telegramChatId: trimmed,
            telegramLinkedAt: new Date(),
          },
          select: { id: true, telegramChatId: true, telegramLinkedAt: true },
        });
        return { linked: true, chatId: updated.telegramChatId, linkedAt: updated.telegramLinkedAt };
      } catch (e: any) {
        if (e?.code === 'P2002') {
          return reply.status(400).send({
            error: 'This Telegram chat is already linked to another user account.',
          });
        }
        throw e;
      }
    } catch (error: any) {
      console.error('Error updating telegram link:', error);
      return reply.status(500).send({ error: 'Failed to update telegram link' });
    }
  });

  // POST /me/telegram/test — send the welcome message to the calling user's
  // linked chat. Confirms end-to-end the link works.
  fastify.post('/me/telegram/test', async (request, reply) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) return reply.status(401).send({ error: 'Not authenticated' });

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, telegramChatId: true },
      });
      if (!user) return reply.status(404).send({ error: 'User not found' });
      if (!user.telegramChatId) {
        return reply.status(400).send({
          error: 'Telegram is not linked. Save your chat ID first, then test.',
        });
      }

      const result = await sendTelegramMessageToChatId({
        chatId: user.telegramChatId,
        text: formatWelcomeMessage({ firstName: user.firstName }),
        parseMode: 'Markdown',
      });
      if (!result.ok) {
        return reply.status(400).send({
          error: `Telegram refused the message: ${result.error ?? result.skipped ?? 'unknown'}. Make sure you have started a chat with @ud_system_bot, then try again.`,
        });
      }
      return { ok: true, telegramMessageId: result.telegramMessageId };
    } catch (error: any) {
      console.error('Error sending telegram welcome:', error);
      return reply.status(500).send({ error: 'Failed to send welcome message' });
    }
  });

  // POST /me/telegram/start-link
  // Mint a one-time code the user will send to @ud_system_bot, so we can
  // discover their chat ID without them having to type it manually.
  fastify.post('/me/telegram/start-link', async (request, reply) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) return reply.status(401).send({ error: 'Not authenticated' });
      if (!isTelegramConfigured()) {
        return reply.status(400).send({ error: 'Telegram is not configured on the server.' });
      }

      pruneExpiredLinkCodes();

      // If user already has an active (non-expired) code, return it
      const existing = userActiveLinkCode.get(userId);
      if (existing) {
        const p = pendingLinkCodes.get(existing);
        if (p && p.expiresAt > Date.now()) {
          return {
            code: p.code,
            expiresAt: new Date(p.expiresAt).toISOString(),
            botUsername: 'ud_system_bot',
            instructions: `Open Telegram, find @ud_system_bot, and send this exact text: ${p.code}`,
          };
        }
      }

      const now = Date.now();
      const code = generateLinkCode();
      const entry: PendingLinkCode = {
        userId,
        code,
        createdAt: now,
        expiresAt: now + LINK_CODE_TTL_MS,
      };
      pendingLinkCodes.set(code, entry);
      userActiveLinkCode.set(userId, code);

      return {
        code,
        expiresAt: new Date(entry.expiresAt).toISOString(),
        botUsername: 'ud_system_bot',
        instructions: `Open Telegram, find @ud_system_bot, and send this exact text: ${code}`,
      };
    } catch (error: any) {
      console.error('Error starting telegram link:', error);
      return reply.status(500).send({ error: 'Failed to start telegram link' });
    }
  });

  // POST /me/telegram/find-me
  // Polls Telegram getUpdates looking for a message matching the user's active
  // link code. If found: saves the chat ID on the User and confirms link.
  // The user must have sent the exact code text to @ud_system_bot first.
  fastify.post('/me/telegram/find-me', async (request, reply) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) return reply.status(401).send({ error: 'Not authenticated' });
      const token = process.env.TELEGRAM_BOT_TOKEN;
      if (!token) return reply.status(400).send({ error: 'Telegram is not configured on the server.' });

      pruneExpiredLinkCodes();

      const code = userActiveLinkCode.get(userId);
      const entry = code ? pendingLinkCodes.get(code) : undefined;
      if (!code || !entry) {
        return reply.status(400).send({
          error: 'No active link code. Click "Start linking" to get a new code.',
        });
      }

      // Poll Telegram for recent updates. The bot's offset/long-poll cursor
      // doesn't matter here — we read all currently-buffered updates and look
      // for our exact code in any message text.
      const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?timeout=0`, {
        signal: AbortSignal.timeout(10_000),
      });
      const json = (await res.json()) as any;
      if (!json?.ok) {
        const errMsg = json?.description ?? `HTTP ${res.status}`;
        return reply.status(502).send({ error: `Telegram API error: ${errMsg}` });
      }

      const updates = json.result || [];
      // Find any update whose message text matches our code (case-insensitive,
      // tolerating whitespace).
      let matched: { chatId: string; chatLabel: string } | null = null;
      const normalizedCode = code.replace(/\s+/g, '').toUpperCase();
      for (const u of updates) {
        const msg = u.message ?? u.edited_message ?? null;
        if (!msg?.text || !msg?.chat?.id) continue;
        const text = String(msg.text).replace(/\s+/g, '').toUpperCase();
        if (text === normalizedCode) {
          matched = {
            chatId: String(msg.chat.id),
            chatLabel:
              msg.chat.username
                ? '@' + msg.chat.username
                : `${msg.chat.first_name ?? ''} ${msg.chat.last_name ?? ''}`.trim() ||
                  `chat:${msg.chat.id}`,
          };
        }
      }

      if (!matched) {
        return reply.status(404).send({
          error: `We did not see your code yet. Make sure you sent the exact text "${code}" to @ud_system_bot, then try again. (Recent updates checked: ${updates.length})`,
        });
      }

      // Make sure no other user is already linked to that chat
      const conflict = await prisma.user.findFirst({
        where: { telegramChatId: matched.chatId, NOT: { id: userId } },
        select: { id: true, email: true },
      });
      if (conflict) {
        return reply.status(400).send({
          error: 'That Telegram chat is already linked to another user account.',
        });
      }

      // Save the link
      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          telegramChatId: matched.chatId,
          telegramLinkedAt: new Date(),
        },
        select: { id: true, firstName: true, telegramChatId: true, telegramLinkedAt: true },
      });

      // Consume the code
      pendingLinkCodes.delete(code);
      userActiveLinkCode.delete(userId);

      // Send a confirmation/welcome message
      void sendTelegramMessageToChatId({
        chatId: matched.chatId,
        text: formatWelcomeMessage({ firstName: updated.firstName }),
        parseMode: 'Markdown',
      });

      return {
        linked: true,
        chatId: updated.telegramChatId,
        linkedAt: updated.telegramLinkedAt,
        chatLabel: matched.chatLabel,
      };
    } catch (error: any) {
      console.error('Error finding telegram link:', error);
      return reply.status(500).send({ error: 'Failed to look up Telegram chat' });
    }
  });

  // ===== NOTIFICATION PREFERENCES =====

  // GET /me/notification-preferences
  // Returns the catalog of all events with the calling user's current
  // inApp/telegram flags (or the default if no subscription row exists yet).
  // Also returns the user-level `notifyOnOwnActions` flag.
  fastify.get('/me/notification-preferences', async (request, reply) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) return reply.status(401).send({ error: 'Not authenticated' });
      const [prefs, user] = await Promise.all([
        getUserPreferences(userId),
        prisma.user.findUnique({ where: { id: userId }, select: { notifyOnOwnActions: true } }),
      ]);
      return {
        events: prefs,
        notifyOnOwnActions: user?.notifyOnOwnActions ?? false,
      };
    } catch (error: any) {
      console.error('Error fetching notification preferences:', error);
      return reply.status(500).send({ error: 'Failed to fetch preferences' });
    }
  });

  // PUT /me/notify-on-own-actions
  // Body: { enabled: boolean }
  // When true, the actor is included in fan-out lists for the events they trigger.
  fastify.put('/me/notify-on-own-actions', async (request, reply) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) return reply.status(401).send({ error: 'Not authenticated' });
      const { enabled } = (request.body || {}) as { enabled?: boolean };
      if (typeof enabled !== 'boolean') {
        return reply.status(400).send({ error: 'enabled (boolean) is required' });
      }
      await prisma.user.update({
        where: { id: userId },
        data: { notifyOnOwnActions: enabled },
      });
      return { notifyOnOwnActions: enabled };
    } catch (error: any) {
      console.error('Error updating notifyOnOwnActions:', error);
      return reply.status(500).send({ error: 'Failed to update setting' });
    }
  });

  // PUT /me/notification-preferences/:eventType
  // Body: { inApp?: boolean, telegram?: boolean }
  // Updates one or both channels for a single event type. Creates the
  // subscription row if it doesn't exist yet.
  fastify.put('/me/notification-preferences/:eventType', async (request, reply) => {
    try {
      const userId = (request as any).user?.userId;
      if (!userId) return reply.status(401).send({ error: 'Not authenticated' });
      const { eventType } = request.params as { eventType: string };
      const body = (request.body || {}) as { inApp?: boolean; telegram?: boolean };
      if (body.inApp === undefined && body.telegram === undefined) {
        return reply.status(400).send({ error: 'At least one of inApp or telegram must be provided' });
      }
      try {
        const updated = await setUserPreference(userId, eventType, body);
        return { eventType, ...updated };
      } catch (e: any) {
        if (e?.message?.startsWith('Unknown eventType')) {
          return reply.status(400).send({ error: e.message });
        }
        throw e;
      }
    } catch (error: any) {
      console.error('Error updating notification preference:', error);
      return reply.status(500).send({ error: 'Failed to update preference' });
    }
  });
}

export default usersRoutes;