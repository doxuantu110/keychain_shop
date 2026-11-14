/**
 * SePay Payment Gateway Integration Service
 * Official SePay Payment Gateway (Cổng thanh toán SePay)
 * Supports Sandbox and Production environments.
 * - Checkout URL initialization & signature generation (initOneTimePaymentFields)
 * - Server-to-server IPN signature / secret verification
 * - Idempotent payment processing
 */

const { SePayPgClient } = require('sepay-pg-node');

class SePayService {
  constructor() {
    this.env = process.env.SEPAY_ENV || 'sandbox';
    this.merchantId = process.env.SEPAY_MERCHANT_ID || process.env['MERCHANT ID'] || 'SP-TEST-DXA34576';
    this.secretKey = process.env.SEPAY_SECRET_KEY || process.env['SECRET KEY'] || 'spsk_test_Hu9o846Pau1dMcJ6Qz3Wy8KZ1fjzjzhZ';
    this.client = null;
    this.initClient();
  }

  initClient() {
    try {
      this.client = new SePayPgClient({
        env: this.env,
        merchant_id: this.merchantId,
        secret_key: this.secretKey,
      });
      console.log(`[SePayService] Initialized SePay Client in ${this.env.toUpperCase()} mode for merchant: ${this.merchantId}`);
    } catch (err) {
      console.error('[SePayService] Failed to initialize SePayPgClient:', err.message);
    }
  }

  /**
   * Tạo session thanh toán One-Time (VietQR qua SePay Sandbox / Production)
   * Trả về action checkoutUrl và toàn bộ input fields kèm chữ ký HMAC-SHA256
   */
  createCheckoutSession({ orderCode, amount, description, successUrl, cancelUrl }) {
    if (!this.client) {
      throw new Error('SePay client is not initialized');
    }

    const frontendBase = process.env.FRONTEND_URL || 'http://localhost:3000';
    const sUrl = successUrl || `${frontendBase}/order-confirmation/${orderCode}?payment_status=success`;
    const cUrl = cancelUrl || `${frontendBase}/order-confirmation/${orderCode}?payment_status=cancelled`;

    const checkoutUrl = this.client.checkout.initCheckoutUrl();
    const fields = this.client.checkout.initOneTimePaymentFields({
      operation: 'PURCHASE',
      payment_method: 'BANK_TRANSFER', // Mặc định VietQR Bank Transfer
      order_invoice_number: orderCode,
      order_amount: Math.round(Number(amount)),
      currency: 'VND',
      order_description: description || `Thanh toan don hang ${orderCode}`,
      success_url: sUrl,
      cancel_url: cUrl,
    });

    return {
      checkoutUrl,
      fields,
      orderCode,
      amount: Math.round(Number(amount)),
    };
  }

  /**
   * Xác thực bảo mật IPN Request từ SePay Gateway
   * Kiểm tra header X-Secret-Key hoặc Authorization Bearer token
   */
  verifyIpnAuth(headers) {
    if (!headers) return false;

    const secretKeyHeader = headers['x-secret-key'] || headers['X-Secret-Key'];
    if (secretKeyHeader && secretKeyHeader === this.secretKey) {
      return true;
    }

    const authHeader = headers['authorization'] || headers['Authorization'];
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim();
      if (token === this.secretKey) {
        return true;
      }
    }

    // Kiểm tra query/custom signature header nếu có
    const customSig = headers['x-sepay-signature'] || headers['X-Sepay-Signature'];
    if (customSig && customSig === this.secretKey) {
      return true;
    }

    return false;
  }
}

const sepayService = new SePayService();
module.exports = sepayService;

