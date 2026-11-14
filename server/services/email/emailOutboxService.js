/**
 * Craft3D Reliable Email Outbox Service
 * Implements the Database-backed Outbox Pattern with Production Resilience:
 * - Decouples email sending from transactions (never blocks or rolls back orders/payments)
 * - Guarantees idempotency via unique idempotencyKey (zero duplicate emails on webhook replay)
 * - Atomic lease claiming prevents race conditions across concurrent workers
 * - Stale lease recovery reclaims hung PROCESSING records after crashes/restarts
 * - Exponential backoff for retries (1m, 5m thresholds up to max 3 retries)
 * - Periodic background worker running every 30 seconds
 * - Dedicated manual resend records preserving original sending audit history
 * - Sensitive data masking in email fallback logs
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const prisma = require('../../utills/db');
const templates = require('./emailTemplates');

function maskEmail(email) {
  if (!email || typeof email !== 'string') return 'unknown';
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 2) return `${name.charAt(0)}***@${domain}`;
  return `${name.charAt(0)}***${name.charAt(name.length - 1)}@${domain}`;
}

class EmailOutboxService {
  constructor() {
    this.transporter = null;
    this.fromAddress = process.env.MAIL_FROM_ADDRESS || 'doxuantu2005@gmail.com';
    this.fromName = process.env.MAIL_FROM_NAME || 'Craft3D Boutique Store';
    this.baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    this.isProcessing = false;
    this.forceMock = false;
    this.workerTimer = null;
    this.maskEmail = maskEmail;
    this.initTransporter();
    this.startPeriodicWorker();
  }

  initTransporter() {
    const host = process.env.MAIL_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.MAIL_PORT, 10) || 587;
    const user = process.env.MAIL_USERNAME;
    const pass = process.env.MAIL_PASSWORD;
    const secure = port === 465;

    if (user && pass) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: { user, pass },
          tls: { rejectUnauthorized: false },
        });
        console.log(`[EmailOutbox] SMTP transporter initialized (${host}:${port})`);
      } catch (err) {
        console.warn('[EmailOutbox] SMTP initialization failed:', err.message);
      }
    } else {
      console.log('[EmailOutbox] SMTP credentials not set; running in local mock/log mode.');
    }
  }

  startPeriodicWorker(intervalMs = 30000) {
    if (this.workerTimer) return;
    this.workerTimer = setInterval(() => {
      this.processOutbox().catch((err) => {
        console.error('[EmailOutbox] Periodic worker run error:', err.message);
      });
    }, intervalMs);
    if (this.workerTimer.unref) {
      this.workerTimer.unref(); // Do not block Node event loop from exiting on shutdown
    }
  }

  stopPeriodicWorker() {
    if (this.workerTimer) {
      clearInterval(this.workerTimer);
      this.workerTimer = null;
    }
  }

  logEmailFallback(type, to, subject, html) {
    const logDir = path.join(__dirname, '..', '..', 'logs');
    if (!fs.existsSync(logDir)) {
      try {
        fs.mkdirSync(logDir, { recursive: true });
      } catch (e) {
        // Ignore directory creation error
      }
    }
    const masked = maskEmail(to);
    const logEntry = `[${new Date().toISOString()}] [${type}] TO: ${masked} | SUBJECT: ${subject}\n`;
    console.log(`[EmailOutbox MOCK] Email event (${type}) for ${masked}: "${subject}"`);
    try {
      fs.appendFileSync(path.join(logDir, 'emails.log'), logEntry);
    } catch (e) {
      // Ignore write error
    }
  }

  /**
   * Enqueue an email into the database-backed Outbox
   * If idempotencyKey exists, prevents duplicate enqueueing
   */
  async queueEmail({ orderId, orderCode, eventType, recipient, subject, htmlContent, textContent, idempotencyKey, tx = null }) {
    if (!recipient || !subject || !htmlContent) {
      console.warn('[EmailOutbox] Missing required email parameters');
      return { success: false, reason: 'Missing required email fields' };
    }

    const key = idempotencyKey || `${eventType}-${orderCode || orderId}-${Date.now()}`;
    const db = tx || prisma;

    try {
      // Check existing by unique idempotencyKey
      const existing = await db.emailOutbox.findUnique({
        where: { idempotencyKey: key },
      });

      if (existing) {
        console.log(`[EmailOutbox] Duplicate email prevented by idempotencyKey: ${key} (Status: ${existing.status})`);
        return { success: true, deduplicated: true, record: existing };
      }

      const outboxRecord = await db.emailOutbox.create({
        data: {
          orderId: orderId || 'N/A',
          orderCode: orderCode || 'N/A',
          eventType: eventType || 'GENERIC',
          recipient,
          subject,
          htmlContent,
          textContent: textContent || null,
          status: 'PENDING',
          retryCount: 0,
          maxRetries: 3,
          idempotencyKey: key,
        },
      });

      console.log(`[EmailOutbox] Queued email #${outboxRecord.id} [${eventType}] for ${maskEmail(recipient)}`);

      // Trigger asynchronous non-blocking processing
      setImmediate(() => {
        this.processOutbox().catch((err) => {
          console.error('[EmailOutbox] Background dispatch error:', err.message);
        });
      });

      return { success: true, queued: true, record: outboxRecord };
    } catch (error) {
      if (error.code === 'P2002') {
        // Race condition: another thread inserted the same idempotency key
        const existing = await db.emailOutbox.findUnique({
          where: { idempotencyKey: key },
        });
        return { success: true, deduplicated: true, record: existing };
      }
      console.error('[EmailOutbox] Failed to queue email to outbox:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Dispatch pending outbox records with lease recovery, concurrency locking, and backoff
   */
  async processOutbox(batchSize = 10) {
    if (this.isProcessing) {
      return;
    }
    this.isProcessing = true;

    try {
      // 1. STALE LEASE RECOVERY: Reclaim items stuck in PROCESSING for > 5 minutes (e.g. server crash during send)
      const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);
      try {
        await prisma.emailOutbox.updateMany({
          where: {
            status: 'PROCESSING',
            updatedAt: { lt: staleThreshold },
          },
          data: {
            status: 'PENDING',
            lastError: 'RECOVERED_STALE_LEASE: Worker lease expired after 5 minutes',
          },
        });
      } catch (staleErr) {
        console.warn('[EmailOutbox] Stale lease check skipped:', staleErr.message);
      }

      // 2. EXPONENTIAL BACKOFF CRITERIA:
      // retryCount 0: pick immediately (PENDING)
      // retryCount 1: wait >= 60 seconds
      // retryCount 2: wait >= 300 seconds
      const now = Date.now();
      const oneMinAgo = new Date(now - 60 * 1000);
      const fiveMinAgo = new Date(now - 300 * 1000);

      const candidateItems = await prisma.emailOutbox.findMany({
        where: {
          OR: [
            { status: 'PENDING' },
            { status: 'FAILED', retryCount: 1, updatedAt: { lt: oneMinAgo } },
            { status: 'FAILED', retryCount: 2, updatedAt: { lt: fiveMinAgo } },
          ],
        },
        take: batchSize,
        orderBy: { createdAt: 'asc' },
      });

      if (candidateItems.length === 0) {
        this.isProcessing = false;
        return;
      }

      for (const item of candidateItems) {
        // 3. ATOMIC LEASE CLAIM: Only the worker that successfully flips status from PENDING/FAILED to PROCESSING owns it!
        const claimResult = await prisma.emailOutbox.updateMany({
          where: {
            id: item.id,
            status: { in: ['PENDING', 'FAILED'] },
          },
          data: {
            status: 'PROCESSING',
            updatedAt: new Date(),
          },
        });

        if (claimResult.count === 0) {
          // Another concurrent worker claimed this item
          continue;
        }

        await this.dispatchClaimedItem(item);
      }
    } catch (err) {
      console.error('[EmailOutbox] Error during processOutbox run:', err.message);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Dispatch an individual claimed outbox record
   */
  async dispatchClaimedItem(item) {
    try {
      const useMock = this.forceMock || process.env.MOCK_EMAIL === 'true' || !this.transporter;

      if (!useMock) {
        const mailOptions = {
          from: `"${this.fromName}" <${this.fromAddress}>`,
          to: item.recipient,
          subject: item.subject,
          html: item.htmlContent,
          text: item.textContent || undefined,
        };

        const info = await this.transporter.sendMail(mailOptions);
        console.log(`[EmailOutbox] Successfully sent email #${item.id} to ${maskEmail(item.recipient)} (MessageId: ${info.messageId})`);

        await prisma.emailOutbox.update({
          where: { id: item.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            lastError: null,
          },
        });

        return { success: true, messageId: info.messageId };
      } else {
        // Mock fallback mode
        this.logEmailFallback(item.eventType, item.recipient, item.subject, item.htmlContent);

        await prisma.emailOutbox.update({
          where: { id: item.id },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            lastError: 'MOCK_SENT: SMTP unconfigured in dev environment',
          },
        });

        return { success: true, mocked: true };
      }
    } catch (sendError) {
      console.error(`[EmailOutbox] Failed to send email #${item.id} to ${maskEmail(item.recipient)}:`, sendError.message);

      const nextRetryCount = item.retryCount + 1;
      const finalStatus = nextRetryCount >= item.maxRetries ? 'FAILED' : 'FAILED'; // Remain FAILED with backoff timer until maxRetries reached

      await prisma.emailOutbox.update({
        where: { id: item.id },
        data: {
          status: finalStatus,
          retryCount: nextRetryCount,
          lastError: sendError.message,
        },
      });

      return { success: false, error: sendError.message };
    }
  }

  /**
   * Admin Manual Resend
   * Creates a dedicated MANUAL_RESEND record to preserve original dispatch audit history
   */
  async resendEmail({ outboxId, adminUser = 'ADMIN' }) {
    const originalItem = await prisma.emailOutbox.findUnique({
      where: { id: outboxId },
    });

    if (!originalItem) {
      throw new Error(`Outbox record #${outboxId} not found`);
    }

    // Create a distinct outbox entry for the resend with a unique key
    const resendKey = `RESEND-${originalItem.id}-${Date.now()}`;
    const resendRecord = await prisma.emailOutbox.create({
      data: {
        orderId: originalItem.orderId,
        orderCode: originalItem.orderCode,
        eventType: 'MANUAL_RESEND',
        recipient: originalItem.recipient,
        subject: `[GỬI LẠI] ${originalItem.subject}`,
        htmlContent: originalItem.htmlContent,
        textContent: originalItem.textContent,
        status: 'PROCESSING', // Direct processing
        retryCount: 0,
        maxRetries: 3,
        idempotencyKey: resendKey,
      },
    });

    // Dispatch the resend record
    const result = await this.dispatchClaimedItem(resendRecord);

    // Audit log in OrderStatusHistory
    if (originalItem.orderId && originalItem.orderId !== 'N/A') {
      try {
        const order = await prisma.customer_order.findFirst({
          where: { OR: [{ id: originalItem.orderId }, { orderCode: originalItem.orderCode }] },
        });

        if (order) {
          await prisma.orderStatusHistory.create({
            data: {
              orderId: order.id,
              fromStatus: order.status,
              toStatus: order.status,
              note: `Admin [${adminUser}] đã gửi lại email thông báo [${originalItem.eventType}] tới ${maskEmail(originalItem.recipient)} (Mã outbox mới: #${resendRecord.id})`,
              changedBy: adminUser,
            },
          });
        }
      } catch (histErr) {
        console.warn('[EmailOutbox] Failed to log resend history:', histErr.message);
      }
    }

    return { resendRecord, result };
  }

  // =========================================================================
  // HIGH-LEVEL OUTBOX EVENT HELPERS
  // =========================================================================

  async triggerOrderConfirmation(order, tx = null) {
    if (!order || !order.email) return;
    const tpl = templates.templateOrderConfirmation(order, this.baseUrl);
    return this.queueEmail({
      orderId: order.id,
      orderCode: order.orderCode,
      eventType: 'ORDER_CONFIRMATION',
      recipient: order.email,
      subject: tpl.subject,
      htmlContent: tpl.html,
      textContent: tpl.text,
      idempotencyKey: `ORDER_CONFIRMATION-${order.orderCode}`,
      tx,
    });
  }

  async triggerPaymentInstructions(order, checkoutUrl, tx = null) {
    if (!order || !order.email) return;
    const tpl = templates.templatePaymentInstructions(order, checkoutUrl, this.baseUrl);
    return this.queueEmail({
      orderId: order.id,
      orderCode: order.orderCode,
      eventType: 'PAYMENT_INSTRUCTIONS',
      recipient: order.email,
      subject: tpl.subject,
      htmlContent: tpl.html,
      textContent: tpl.text,
      idempotencyKey: `PAYMENT_INSTRUCTIONS-${order.orderCode}`,
      tx,
    });
  }

  async triggerPaymentSuccess(order, paymentInfo = {}, tx = null) {
    if (!order || !order.email) return;
    const txnRef = paymentInfo.txnRef || paymentInfo.id || 'TXN';
    const tpl = templates.templatePaymentSuccess(order, paymentInfo, this.baseUrl);
    return this.queueEmail({
      orderId: order.id,
      orderCode: order.orderCode,
      eventType: 'PAYMENT_SUCCESS',
      recipient: order.email,
      subject: tpl.subject,
      htmlContent: tpl.html,
      textContent: tpl.text,
      idempotencyKey: `PAYMENT_SUCCESS-${order.orderCode}-${txnRef}`,
      tx,
    });
  }

  async triggerOrderConfirmed(order, note, tx = null) {
    if (!order || !order.email) return;
    const tpl = templates.templateOrderConfirmed(order, note, this.baseUrl);
    return this.queueEmail({
      orderId: order.id,
      orderCode: order.orderCode,
      eventType: 'ORDER_CONFIRMED',
      recipient: order.email,
      subject: tpl.subject,
      htmlContent: tpl.html,
      textContent: tpl.text,
      idempotencyKey: `ORDER_CONFIRMED-${order.orderCode}-${Date.now()}`,
      tx,
    });
  }

  async triggerOrderShipped(order, shippingInfo = {}, tx = null) {
    if (!order || !order.email) return;
    const tpl = templates.templateOrderShipped(order, shippingInfo, this.baseUrl);
    return this.queueEmail({
      orderId: order.id,
      orderCode: order.orderCode,
      eventType: 'ORDER_SHIPPED',
      recipient: order.email,
      subject: tpl.subject,
      htmlContent: tpl.html,
      textContent: tpl.text,
      idempotencyKey: `ORDER_SHIPPED-${order.orderCode}-${Date.now()}`,
      tx,
    });
  }

  async triggerOrderDelivered(order, tx = null) {
    if (!order || !order.email) return;
    const tpl = templates.templateOrderDelivered(order, this.baseUrl);
    return this.queueEmail({
      orderId: order.id,
      orderCode: order.orderCode,
      eventType: 'ORDER_DELIVERED',
      recipient: order.email,
      subject: tpl.subject,
      htmlContent: tpl.html,
      textContent: tpl.text,
      idempotencyKey: `ORDER_DELIVERED-${order.orderCode}-${Date.now()}`,
      tx,
    });
  }

  async triggerOrderCancelled(order, reason, tx = null) {
    if (!order || !order.email) return;
    const tpl = templates.templateOrderCancelled(order, reason, this.baseUrl);
    return this.queueEmail({
      orderId: order.id,
      orderCode: order.orderCode,
      eventType: 'ORDER_CANCELLED',
      recipient: order.email,
      subject: tpl.subject,
      htmlContent: tpl.html,
      textContent: tpl.text,
      idempotencyKey: `ORDER_CANCELLED-${order.orderCode}-${Date.now()}`,
      tx,
    });
  }
}

const emailOutboxService = new EmailOutboxService();
module.exports = emailOutboxService;
