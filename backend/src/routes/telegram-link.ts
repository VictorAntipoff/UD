// Internal Telegram link consumption endpoint.
// Called by the @ud_system_bot Telegraf service when a user sends a UD-LINK-XXX
// code message. NOT user-facing — protected by a shared secret in the
// `x-telegram-link-secret` header. The bot service holds the matching value
// in its TELEGRAM_LINK_SECRET env var.

import { FastifyInstance } from 'fastify';
import { prisma } from '../lib/prisma.js';
import {
  pendingLinkCodes,
  userActiveLinkCode,
  pruneExpiredLinkCodes,
} from '../lib/telegramLinkStore.js';

async function telegramLinkRoutes(fastify: FastifyInstance) {
  // POST /api/telegram/consume-link-code
  fastify.post('/consume-link-code', async (request, reply) => {
    try {
      // 1. Authenticate the caller (the bot)
      const expectedSecret = process.env.TELEGRAM_LINK_SECRET;
      if (!expectedSecret) {
        console.error('[telegram-link] TELEGRAM_LINK_SECRET missing in backend env');
        return reply.status(500).send({ error: 'Server misconfigured' });
      }
      const provided = request.headers['x-telegram-link-secret'];
      if (provided !== expectedSecret) {
        // Don't leak whether the route exists
        return reply.status(404).send({ error: 'Not found' });
      }

      // 2. Validate body
      const body = (request.body || {}) as {
        code?: string;
        chatId?: string | number;
        chatLabel?: string;
      };
      const code = String(body.code ?? '').trim().toUpperCase();
      const chatId = body.chatId === undefined ? '' : String(body.chatId).trim();
      if (!code || !chatId) {
        return reply.status(400).send({ error: 'code and chatId are required' });
      }
      if (!/^-?\d+$/.test(chatId)) {
        return reply.status(400).send({ error: 'chatId must be numeric' });
      }

      // 3. Look up the code
      pruneExpiredLinkCodes();
      const entry = pendingLinkCodes.get(code);
      if (!entry) {
        return reply.status(404).send({
          ok: false,
          reason: 'unknown_or_expired',
          message: 'That code is unknown or has expired. Click "Start linking" again to get a fresh one.',
        });
      }

      // 4. Refuse if that chat is already linked to a different user
      const conflict = await prisma.user.findFirst({
        where: { telegramChatId: chatId, NOT: { id: entry.userId } },
        select: { id: true, email: true },
      });
      if (conflict) {
        return reply.status(409).send({
          ok: false,
          reason: 'chat_already_linked',
          message: 'That Telegram chat is already linked to another user. Each chat can be used by one user only.',
        });
      }

      // 5. Save the link
      const updated = await prisma.user.update({
        where: { id: entry.userId },
        data: {
          telegramChatId: chatId,
          telegramLinkedAt: new Date(),
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });

      // 6. Consume the code
      pendingLinkCodes.delete(code);
      if (userActiveLinkCode.get(entry.userId) === code) {
        userActiveLinkCode.delete(entry.userId);
      }

      return reply.send({
        ok: true,
        user: {
          id: updated.id,
          email: updated.email,
          firstName: updated.firstName,
          lastName: updated.lastName,
          role: updated.role,
        },
      });
    } catch (err: any) {
      console.error('[telegram-link] consume-link-code failed:', err);
      return reply.status(500).send({ error: 'Failed to consume link code' });
    }
  });
}

export default telegramLinkRoutes;
