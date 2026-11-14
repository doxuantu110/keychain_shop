/**
 * Craft3D Unified Email Service & Outbox Facade
 * Provides 100% backward compatibility for existing callers while routing
 * all notifications through the durable database-backed Email Outbox Pattern.
 */

const emailOutboxService = require('./email/emailOutboxService');
const emailTemplates = require('./email/emailTemplates');

class EmailService {
  constructor() {
    this.outbox = emailOutboxService;
    this.templates = emailTemplates;
  }

  // 1. Order Confirmation (COD & SePay)
  async sendOrderConfirmation(order, tx = null) {
    return this.outbox.triggerOrderConfirmation(order, tx);
  }

  // 2. Payment Instructions (SePay Pending)
  async sendPaymentInstructions(order, checkoutUrl, tx = null) {
    return this.outbox.triggerPaymentInstructions(order, checkoutUrl, tx);
  }

  // 3. Payment Success (Post-IPN only)
  async sendPaymentSuccess(order, paymentInfo = {}, tx = null) {
    return this.outbox.triggerPaymentSuccess(order, paymentInfo, tx);
  }

  // 4. Order Status Update (Dispatches matching specific template)
  async sendOrderStatusUpdate(order, newStatus, note, extraData = {}, tx = null) {
    const status = (newStatus || '').toUpperCase();
    switch (status) {
      case 'CONFIRMED':
        return this.outbox.triggerOrderConfirmed(order, note, tx);
      case 'SHIPPED':
        return this.outbox.triggerOrderShipped(order, { note, ...extraData }, tx);
      case 'DELIVERED':
        return this.outbox.triggerOrderDelivered(order, tx);
      case 'CANCELLED':
        return this.outbox.triggerOrderCancelled(order, note, tx);
      case 'PROCESSING':
        return this.outbox.queueEmail({
          orderId: order.id,
          orderCode: order.orderCode,
          eventType: 'ORDER_PROCESSING',
          recipient: order.email,
          subject: `[Craft3D] Đơn hàng #${order.orderCode} đang được in 3D & chế tác`,
          htmlContent: this.templates.wrapLayout(
            `Đang in 3D #${order.orderCode}`,
            `
            <h2 style="font-size: 20px; font-weight: 800; color: #1E2229; margin-top: 0;">Đơn hàng #${order.orderCode} đang được in 3D</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #4B5563;">
              Kỹ thuật viên tại xưởng Craft3D đang tiến hành nạp vật liệu và chạy máy in 3D cho các chi tiết móc khóa của bạn.
            </p>
            <div class="order-box" style="text-align: center;">
              <span class="badge badge-processing">ĐANG CHẾ TÁC IN 3D</span>
              ${note ? `<p style="font-size: 13px; color: #4B5563; margin-top: 10px;"><em>"${note}"</em></p>` : ''}
            </div>
            `
          ),
          idempotencyKey: `ORDER_PROCESSING-${order.orderCode}-${Date.now()}`,
          tx,
        });
      default:
        console.log(`[EmailService] No specialized email trigger for status ${status}`);
        return { skipped: true };
    }
  }

  // Specific triggers
  async sendOrderConfirmed(order, note, tx = null) {
    return this.outbox.triggerOrderConfirmed(order, note, tx);
  }

  async sendOrderShipped(order, shippingInfo, tx = null) {
    return this.outbox.triggerOrderShipped(order, shippingInfo, tx);
  }

  async sendOrderDelivered(order, tx = null) {
    return this.outbox.triggerOrderDelivered(order, tx);
  }

  async sendOrderCancelled(order, reason, tx = null) {
    return this.outbox.triggerOrderCancelled(order, reason, tx);
  }

  // Outbox direct operations
  async processOutbox(batchSize) {
    return this.outbox.processOutbox(batchSize);
  }

  async resendEmail(params) {
    return this.outbox.resendEmail(params);
  }
}

const emailService = new EmailService();
module.exports = emailService;
