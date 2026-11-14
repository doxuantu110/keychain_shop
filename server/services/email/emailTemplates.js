/**
 * Craft3D Vietnamese Email Templates with XSS / HTML Injection Defense
 * 7 Branded Responsive Transactional Templates:
 * 1. ORDER_CONFIRMATION (COD & SePay)
 * 2. PAYMENT_INSTRUCTIONS (SePay Pending)
 * 3. PAYMENT_SUCCESS (Post-IPN only)
 * 4. ORDER_CONFIRMED (Admin confirmation)
 * 5. ORDER_SHIPPED (Admin shipped with carrier info)
 * 6. ORDER_DELIVERED (Completed delivery & care guide)
 * 7. ORDER_CANCELLED (Cancellation with clear reason)
 */

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatVND(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
}

function formatDate(date) {
  return new Date(date || Date.now()).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Base responsive HTML email wrapper with Craft3D Boutique Brand styling
 */
function wrapLayout(title, content) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #FAF9F6; color: #1E2229; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .wrapper { max-width: 620px; margin: 24px auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #E7E5E4; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.04); }
    .header { background: linear-gradient(135deg, #1E2229 0%, #2D323C 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .brand { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }
    .brand span { color: #E06D53; }
    .tagline { font-size: 13px; color: #D1D5DB; margin-top: 6px; }
    .content { padding: 32px 24px; }
    .order-box { background-color: #FDF2EE; border: 1px solid rgba(224, 109, 83, 0.25); border-radius: 12px; padding: 18px; margin: 20px 0; }
    .info-box { background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; margin: 18px 0; }
    .table { width: 100%; border-collapse: collapse; margin-top: 16px; }
    .table th { text-align: left; font-size: 12px; color: #6B7280; text-transform: uppercase; padding-bottom: 8px; border-bottom: 1px solid #E5E7EB; }
    .table td { padding: 12px 0; border-bottom: 1px solid #F3F4F6; font-size: 13px; vertical-align: top; }
    .total-row td { border-bottom: none; font-size: 14px; font-weight: 700; color: #1E2229; }
    .total-amount { color: #E06D53; font-size: 18px; font-weight: 800; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; }
    .badge-paid { background-color: #DCFCE7; color: #166534; }
    .badge-pending { background-color: #FEF3C7; color: #92400E; }
    .badge-confirmed { background-color: #DBEAFE; color: #1E40AF; }
    .badge-processing { background-color: #E0E7FF; color: #3730A3; }
    .badge-shipped { background-color: #FFEDD5; color: #9A3412; }
    .badge-cancelled { background-color: #FEE2E2; color: #991B1B; }
    .btn { display: inline-block; background-color: #E06D53; color: #ffffff !important; text-decoration: none; padding: 12px 26px; border-radius: 10px; font-weight: 700; font-size: 14px; text-align: center; margin-top: 16px; }
    .btn-blue { background-color: #2563EB; }
    .footer { background-color: #FAF9F6; padding: 24px; text-align: center; font-size: 12px; color: #9CA3AF; border-top: 1px solid #E7E5E4; }
    .custom-pill { display: inline-block; background: #FFF5F2; border: 1px solid #FBD0C4; border-radius: 6px; padding: 3px 8px; font-size: 11px; color: #E06D53; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1 class="brand">CRAFT<span>3D</span></h1>
      <p class="tagline">Móc khóa & Phụ kiện chế tác in 3D cá nhân hóa</p>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p><strong>Craft3D Boutique Studio</strong> • Hotline / Zalo: 0987.654.321 • Email: support@craft3d.vn</p>
      <p>Chuyên thiết kế, in 3D và cá nhân hóa móc khóa cao cấp.</p>
    </div>
  </div>
</body>
</html>`;
}

function renderOrderItemsTable(products = [], subtotal = 0, shippingFee = 0, total = 0) {
  const itemsHtml = products.map((p) => {
    const customList = [];
    if (p.customText) customList.push(`Khắc chữ: <strong>&ldquo;${escapeHtml(p.customText)}&rdquo;</strong>`);
    if (p.customFont) customList.push(`Font: <em>${escapeHtml(p.customFont)}</em>`);
    if (p.customQrUrl) customList.push(`QR: ${escapeHtml(p.customQrUrl)}`);
    const customDetails = customList.length > 0 ? `<div class="custom-pill">${customList.join(' • ')}</div>` : '';
    const sizeDetail = p.sizeLabel ? `<span style="color: #6B7280; font-size: 11px;">Kích thước: ${escapeHtml(p.sizeLabel)}</span>` : '';

    return `<tr>
      <td>
        <strong style="color: #1E2229;">${escapeHtml(p.productTitle || 'Móc khóa in 3D Craft3D')}</strong><br>
        ${sizeDetail}
        ${customDetails}
      </td>
      <td style="text-align: center;">${p.quantity}</td>
      <td style="text-align: right; font-weight: 600;">${formatVND((p.unitPrice || 0) * (p.quantity || 1))}</td>
    </tr>`;
  }).join('');

  return `
    <table class="table">
      <thead>
        <tr>
          <th>Sản phẩm & Khắc tên</th>
          <th style="text-align: center;">SL</th>
          <th style="text-align: right;">Thành tiền</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
        <tr>
          <td colspan="2" style="padding-top: 12px; color: #6B7280;">Tạm tính tiền hàng:</td>
          <td style="padding-top: 12px; text-align: right; font-weight: 600;">${formatVND(subtotal)}</td>
        </tr>
        <tr>
          <td colspan="2" style="color: #6B7280;">Phí vận chuyển toàn quốc:</td>
          <td style="text-align: right; font-weight: 600;">${shippingFee === 0 ? '<span style="color: #166534;">Miễn phí</span>' : formatVND(shippingFee)}</td>
        </tr>
        <tr class="total-row">
          <td colspan="2" style="padding-top: 10px; border-top: 2px solid #E5E7EB;">Tổng giá trị đơn hàng:</td>
          <td style="padding-top: 10px; border-top: 2px solid #E5E7EB; text-align: right;" class="total-amount">${formatVND(total)}</td>
        </tr>
      </tbody>
    </table>
  `;
}

function getRecipientName(order) {
  return order.fullName || `${order.lastname || ''} ${order.name || ''}`.trim() || 'Quý khách';
}

function getFullAddress(order) {
  return [order.addressDetail, order.ward, order.district, order.province].filter(Boolean).join(', ') || order.adress || 'Chưa cung cấp';
}

// =========================================================================
// 7 TEMPLATES IMPLEMENTATION WITH ESCAPED HTML
// =========================================================================

/**
 * 1. Order Confirmation (Xác nhận tạo đơn - COD & SePay)
 */
function templateOrderConfirmation(order, baseUrl = 'http://localhost:3000') {
  const recipientName = escapeHtml(getRecipientName(order));
  const address = escapeHtml(getFullAddress(order));
  const orderCode = escapeHtml(order.orderCode);
  const phone = escapeHtml(order.phone);
  const orderNotice = escapeHtml(order.orderNotice);
  const isCOD = order.paymentMethod === 'COD';
  const paymentLabel = isCOD ? 'Thanh toán tiền mặt khi nhận hàng (COD)' : 'Chuyển khoản VietQR qua Cổng SePay';
  const isPaid = order.paymentStatus === 'PAID';

  const content = `
    <h2 style="font-size: 20px; font-weight: 800; color: #1E2229; margin-top: 0;">Xác nhận đơn hàng #${orderCode}</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #4B5563;">
      Xin chào <strong>${recipientName}</strong>,<br>
      Cảm ơn bạn đã đặt hàng tại <strong>Craft3D</strong>. Đơn hàng của bạn đã được ghi nhận trên hệ thống và xưởng đang chuẩn bị phôi in 3D theo yêu cầu cá nhân hóa của bạn.
    </p>

    <div class="order-box">
      <table style="width: 100%; font-size: 13px;">
        <tr>
          <td style="color: #6B7280; padding: 4px 0;">Mã đơn hàng:</td>
          <td style="font-weight: 800; color: #E06D53; font-family: monospace; font-size: 15px; text-align: right;">${orderCode}</td>
        </tr>
        <tr>
          <td style="color: #6B7280; padding: 4px 0;">Ngày đặt:</td>
          <td style="font-weight: 600; text-align: right;">${formatDate(order.createdAt)}</td>
        </tr>
        <tr>
          <td style="color: #6B7280; padding: 4px 0;">Phương thức thanh toán:</td>
          <td style="font-weight: 600; text-align: right;">${paymentLabel}</td>
        </tr>
        <tr>
          <td style="color: #6B7280; padding: 4px 0;">Trạng thái thanh toán:</td>
          <td style="text-align: right;">
            <span class="badge ${isPaid ? 'badge-paid' : 'badge-pending'}">
              ${isPaid ? 'ĐÃ THANH TOÁN' : 'CHỜ THANH TOÁN'}
            </span>
          </td>
        </tr>
      </table>
    </div>

    <h3 style="font-size: 15px; font-weight: 700; color: #1E2229; margin: 24px 0 8px 0; border-bottom: 2px solid #F3F4F6; padding-bottom: 6px;">Chi tiết sản phẩm đặt làm</h3>
    ${renderOrderItemsTable(order.products, order.subtotal, order.shippingFee, order.total)}

    <h3 style="font-size: 15px; font-weight: 700; color: #1E2229; margin: 24px 0 8px 0; border-bottom: 2px solid #F3F4F6; padding-bottom: 6px;">Địa chỉ giao hàng</h3>
    <p style="font-size: 13px; line-height: 1.6; color: #4B5563; margin: 0;">
      <strong>Người nhận:</strong> ${recipientName}<br>
      <strong>Số điện thoại:</strong> ${phone}<br>
      <strong>Địa chỉ:</strong> ${address}<br>
      ${orderNotice ? `<strong>Ghi chú đơn:</strong> <em>&ldquo;${orderNotice}&rdquo;</em>` : ''}
    </p>

    <div style="text-align: center; margin-top: 28px;">
      <a href="${baseUrl}/order-confirmation/${orderCode}" class="btn">
        Xem chi tiết đơn hàng
      </a>
    </div>
  `;

  const text = `Craft3D - Xác nhận đơn hàng #${order.orderCode}
Xin chào ${getRecipientName(order)},
Đơn hàng của bạn đã được ghi nhận tại Craft3D.
Mã đơn hàng: ${order.orderCode}
Tổng thanh toán: ${formatVND(order.total)}
Phương thức: ${paymentLabel}
Địa chỉ giao hàng: ${getFullAddress(order)}
Xem chi tiết tại: ${baseUrl}/order-confirmation/${order.orderCode}`;

  return {
    subject: `[Craft3D] Xác nhận đơn hàng #${order.orderCode}`,
    html: wrapLayout(`Xác nhận đơn hàng #${order.orderCode}`, content),
    text,
  };
}

/**
 * 2. SePay Payment Instructions (Hướng dẫn thanh toán VietQR)
 */
function templatePaymentInstructions(order, checkoutUrl, baseUrl = 'http://localhost:3000') {
  const recipientName = escapeHtml(getRecipientName(order));
  const orderCode = escapeHtml(order.orderCode);
  const payUrl = checkoutUrl || `${baseUrl}/order-confirmation/${order.orderCode}`;

  const content = `
    <h2 style="font-size: 20px; font-weight: 800; color: #1E2229; margin-top: 0;">Hướng dẫn thanh toán đơn hàng #${orderCode}</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #4B5563;">
      Xin chào <strong>${recipientName}</strong>,<br>
      Bạn đã chọn hình thức thanh toán <strong>Chuyển khoản VietQR (Cổng thanh toán SePay)</strong> cho đơn hàng <strong>#${orderCode}</strong>.
    </p>

    <div class="order-box" style="text-align: center;">
      <p style="margin: 0 0 6px 0; font-size: 13px; color: #6B7280;">Số tiền cần thanh toán:</p>
      <p style="margin: 0; font-size: 26px; font-weight: 800; color: #E06D53;">${formatVND(order.total)}</p>
      <p style="margin: 8px 0 0 0; font-size: 13px; color: #1E2229;">
        Nội dung chuyển khoản (Tự động quét QR): <strong style="font-family: monospace; font-size: 15px; color: #2563EB;">${orderCode}</strong>
      </p>
    </div>

    <div style="text-align: center; margin: 26px 0;">
      <a href="${payUrl}" class="btn btn-blue">
        Mở Cổng Thanh Toán SePay (Quét mã VietQR)
      </a>
    </div>

    <div class="info-box">
      <p style="font-size: 12px; color: #4B5563; line-height: 1.6; margin: 0;">
        💡 <strong>Lưu ý quan trọng:</strong><br>
        • Vui lòng giữ nguyên nội dung chuyển khoản là <strong>${orderCode}</strong> để hệ thống SePay tự động ghi nhận.<br>
        • Ngay sau khi chuyển khoản thành công, hệ thống sẽ xác nhận và gửi email thanh toán thành công trong 1-3 phút.
      </p>
    </div>
  `;

  const text = `Craft3D - Hướng dẫn thanh toán đơn hàng #${order.orderCode}
Xin chào ${getRecipientName(order)},
Số tiền cần thanh toán: ${formatVND(order.total)}
Nội dung chuyển khoản: ${order.orderCode}
Đường dẫn thanh toán: ${payUrl}`;

  return {
    subject: `[Craft3D] Hướng dẫn thanh toán đơn hàng #${order.orderCode}`,
    html: wrapLayout(`Hướng dẫn thanh toán #${order.orderCode}`, content),
    text,
  };
}

/**
 * 3. Payment Success (Thanh toán thành công - Chỉ sau IPN SePay)
 */
function templatePaymentSuccess(order, paymentInfo = {}, baseUrl = 'http://localhost:3000') {
  const recipientName = escapeHtml(getRecipientName(order));
  const orderCode = escapeHtml(order.orderCode);
  const txnRef = escapeHtml(paymentInfo.txnRef || paymentInfo.id || 'N/A');
  const paidAmount = paymentInfo.amount || order.total;

  const content = `
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; border-radius: 50%; background-color: #DCFCE7; color: #166534; font-size: 28px;">✓</div>
      <h2 style="font-size: 22px; font-weight: 800; color: #166534; margin: 12px 0 4px 0;">Thanh toán thành công!</h2>
      <p style="font-size: 13px; color: #4B5563; margin: 0;">Giao dịch VietQR qua Cổng SePay đã được hệ thống tự động xác thực.</p>
    </div>

    <p style="font-size: 14px; line-height: 1.6; color: #4B5563;">
      Xin chào <strong>${recipientName}</strong>,<br>
      Craft3D đã nhận được khoản thanh toán cho đơn hàng <strong>#${orderCode}</strong>. Đơn hàng của bạn đã chuyển sang trạng thái <strong>ĐÃ XÁC NHẬN (CONFIRMED)</strong> và xưởng đang tiến hành in 3D theo thiết kế của bạn.
    </p>

    <div class="order-box">
      <table style="width: 100%; font-size: 13px;">
        <tr>
          <td style="color: #6B7280; padding: 4px 0;">Mã đơn hàng:</td>
          <td style="font-weight: 800; color: #1E2229; font-family: monospace; font-size: 15px; text-align: right;">${orderCode}</td>
        </tr>
        <tr>
          <td style="color: #6B7280; padding: 4px 0;">Mã giao dịch cổng (TxnRef):</td>
          <td style="font-weight: 600; text-align: right; font-family: monospace;">${txnRef}</td>
        </tr>
        <tr>
          <td style="color: #6B7280; padding: 4px 0;">Số tiền đã thanh toán:</td>
          <td style="font-weight: 800; color: #166534; text-align: right; font-size: 15px;">${formatVND(paidAmount)}</td>
        </tr>
        <tr>
          <td style="color: #6B7280; padding: 4px 0;">Thời gian xác nhận:</td>
          <td style="font-weight: 600; text-align: right;">${formatDate(new Date())}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${baseUrl}/order-confirmation/${orderCode}" class="btn">
        Xem tiến độ chế tác đơn hàng
      </a>
    </div>
  `;

  const text = `Craft3D - Thanh toán thành công đơn hàng #${order.orderCode}
Xin chào ${getRecipientName(order)},
Giao dịch thanh toán VietQR cho đơn hàng #${order.orderCode} đã thành công.
Số tiền: ${formatVND(paidAmount)}
Mã giao dịch: ${paymentInfo.txnRef || paymentInfo.id || 'N/A'}
Xem chi tiết tại: ${baseUrl}/order-confirmation/${order.orderCode}`;

  return {
    subject: `[Craft3D] Thanh toán thành công cho đơn hàng #${order.orderCode}`,
    html: wrapLayout(`Thanh toán thành công #${order.orderCode}`, content),
    text,
  };
}

/**
 * 4. Order Confirmed (Admin phê duyệt đơn)
 */
function templateOrderConfirmed(order, note, baseUrl = 'http://localhost:3000') {
  const recipientName = escapeHtml(getRecipientName(order));
  const orderCode = escapeHtml(order.orderCode);
  const escapedNote = escapeHtml(note);

  const content = `
    <h2 style="font-size: 20px; font-weight: 800; color: #1E2229; margin-top: 0;">Đơn hàng #${orderCode} đã được xác nhận</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #4B5563;">
      Xin chào <strong>${recipientName}</strong>,<br>
      Đơn hàng <strong>#${orderCode}</strong> đã được đội ngũ Craft3D kiểm tra thiết kế, xác nhận thông tin khắc laser và đưa vào lịch in 3D.
    </p>

    <div class="order-box" style="text-align: center;">
      <span class="badge badge-confirmed" style="font-size: 13px; padding: 6px 16px;">
        ĐÃ XÁC NHẬN (CONFIRMED)
      </span>
      ${escapedNote ? `<p style="font-size: 13px; color: #4B5563; margin-top: 10px; margin-bottom: 0;"><em>Ghi chú từ xưởng: &ldquo;${escapedNote}&rdquo;</em></p>` : ''}
    </div>

    <p style="font-size: 13px; color: #4B5563; line-height: 1.6;">
      Quy trình sản xuất móc khóa in 3D bao gồm: Căn chỉnh file in → In đa lớp chính xác cao → Khắc laser nội dung cá nhân hóa → Đóng gói hộp quà Craft3D.
    </p>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${baseUrl}/order-lookup" class="btn">
        Theo dõi tiến độ đơn hàng
      </a>
    </div>
  `;

  const text = `Craft3D - Đơn hàng #${order.orderCode} đã được xác nhận
Xin chào ${getRecipientName(order)},
Đơn hàng #${order.orderCode} của bạn đã được xác nhận và xưởng đang chuẩn bị in 3D.
Theo dõi tại: ${baseUrl}/order-lookup`;

  return {
    subject: `[Craft3D] Đơn hàng #${order.orderCode} đã được xác nhận`,
    html: wrapLayout(`Đơn hàng #${order.orderCode} đã xác nhận`, content),
    text,
  };
}

/**
 * 5. Order Shipped (Admin đánh dấu đang giao hàng)
 */
function templateOrderShipped(order, shippingInfo = {}, baseUrl = 'http://localhost:3000') {
  const recipientName = escapeHtml(getRecipientName(order));
  const address = escapeHtml(getFullAddress(order));
  const orderCode = escapeHtml(order.orderCode);
  const carrier = escapeHtml(shippingInfo.carrier || 'Bưu tá Giao Hàng Nhanh / Viettel Post');
  const trackingCode = escapeHtml(shippingInfo.trackingCode || shippingInfo.trackingNumber || '');
  const note = escapeHtml(shippingInfo.note || order.orderNotice || '');

  const content = `
    <h2 style="font-size: 20px; font-weight: 800; color: #1E2229; margin-top: 0;">Đơn hàng #${orderCode} đang được giao</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #4B5563;">
      Xin chào <strong>${recipientName}</strong>,<br>
      Sản phẩm móc khóa in 3D của bạn đã hoàn tất công đoạn chế tác tinh xảo, đóng gói cẩn thận và đã được bàn giao cho đối tác vận chuyển.
    </p>

    <div class="order-box">
      <table style="width: 100%; font-size: 13px;">
        <tr>
          <td style="color: #6B7280; padding: 4px 0;">Trạng thái:</td>
          <td style="text-align: right;"><span class="badge badge-shipped">ĐANG GIAO HÀNG</span></td>
        </tr>
        <tr>
          <td style="color: #6B7280; padding: 4px 0;">Đơn vị vận chuyển:</td>
          <td style="font-weight: 600; text-align: right;">${carrier}</td>
        </tr>
        ${trackingCode ? `<tr>
          <td style="color: #6B7280; padding: 4px 0;">Mã vận đơn:</td>
          <td style="font-weight: 800; color: #E06D53; font-family: monospace; text-align: right;">${trackingCode}</td>
        </tr>` : ''}
        <tr>
          <td style="color: #6B7280; padding: 4px 0;">Địa chỉ giao hàng:</td>
          <td style="font-weight: 600; text-align: right;">${address}</td>
        </tr>
        <tr>
          <td style="color: #6B7280; padding: 4px 0;">Số tiền thu khi nhận (COD):</td>
          <td style="font-weight: 800; color: #E06D53; text-align: right; font-size: 15px;">
            ${order.paymentMethod === 'COD' && order.paymentStatus !== 'PAID' ? formatVND(order.total) : '0 ₫ (Đã thanh toán trước)'}
          </td>
        </tr>
      </table>
      ${note ? `<p style="font-size: 12px; color: #4B5563; margin-top: 10px; margin-bottom: 0;"><em>Lưu ý giao hàng: &ldquo;${note}&rdquo;</em></p>` : ''}
    </div>

    <p style="font-size: 13px; color: #6B7280; line-height: 1.5;">
      * Quý khách vui lòng để ý điện thoại để bưu tá tiện liên hệ khi giao bưu phẩm.
    </p>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${baseUrl}/order-lookup" class="btn">
        Kiểm tra hành trình đơn hàng
      </a>
    </div>
  `;

  const text = `Craft3D - Đơn hàng #${order.orderCode} đang được giao
Xin chào ${getRecipientName(order)},
Đơn hàng #${order.orderCode} đã được giao cho bưu tá (${shippingInfo.carrier || 'Bưu tá'}).
Địa chỉ nhận: ${getFullAddress(order)}
Tiền thu hộ COD: ${order.paymentMethod === 'COD' && order.paymentStatus !== 'PAID' ? formatVND(order.total) : '0 VND (Đã thanh toán)'}
Tra cứu tại: ${baseUrl}/order-lookup`;

  return {
    subject: `[Craft3D] Đơn hàng #${order.orderCode} đang trên đường giao đến bạn`,
    html: wrapLayout(`Đơn hàng #${order.orderCode} đang giao`, content),
    text,
  };
}

/**
 * 6. Order Delivered (Giao hàng thành công & hướng dẫn bảo quản)
 */
function templateOrderDelivered(order, baseUrl = 'http://localhost:3000') {
  const recipientName = escapeHtml(getRecipientName(order));
  const orderCode = escapeHtml(order.orderCode);

  const content = `
    <div style="text-align: center; margin-bottom: 20px;">
      <div style="display: inline-block; width: 56px; height: 56px; line-height: 56px; border-radius: 50%; background-color: #DCFCE7; color: #166534; font-size: 28px;">♥</div>
      <h2 style="font-size: 22px; font-weight: 800; color: #166534; margin: 12px 0 4px 0;">Giao hàng thành công!</h2>
      <p style="font-size: 13px; color: #4B5563; margin: 0;">Đơn hàng #${orderCode} đã được giao tận tay bạn.</p>
    </div>

    <p style="font-size: 14px; line-height: 1.6; color: #4B5563;">
      Xin chào <strong>${recipientName}</strong>,<br>
      Craft3D chân thành cảm ơn bạn đã tin tưởng và đồng hành cùng chúng tôi. Hy vọng chiếc móc khóa in 3D cá nhân hóa độc bản này sẽ mang lại niềm vui cho bạn hoặc người thân được nhận món quà này.
    </p>

    <div class="info-box">
      <h4 style="margin: 0 0 8px 0; color: #1E2229; font-size: 13px;">💡 Mẹo bảo quản móc khóa in 3D bền đẹp:</h4>
      <ul style="margin: 0; padding-left: 20px; font-size: 12px; color: #4B5563; line-height: 1.6;">
        <li>Vệ sinh nhẹ nhàng bằng khăn mềm khô hoặc ẩm nhẹ, tránh chất tẩy rửa mạnh.</li>
        <li>Hạn chế tiếp xúc nguồn nhiệt cao trên 60°C để giữ phom dáng nhựa in sắc sảo nhất.</li>
        <li>Tránh va chạm trực tiếp với vật sắc nhọn để giữ bề mặt chữ khắc sắc nét.</li>
      </ul>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${baseUrl}/shop" class="btn">
        Khám phá thêm các mẫu mới tại Craft3D
      </a>
    </div>
  `;

  const text = `Craft3D - Đơn hàng #${order.orderCode} đã giao thành công
Xin chào ${getRecipientName(order)},
Đơn hàng #${order.orderCode} đã giao hoàn tất. Cảm ơn bạn đã ủng hộ xưởng Craft3D!`;

  return {
    subject: `[Craft3D] Đơn hàng #${order.orderCode} đã được giao thành công`,
    html: wrapLayout(`Đơn hàng #${order.orderCode} giao thành công`, content),
    text,
  };
}

/**
 * 7. Order Cancelled (Thông báo hủy đơn minh bạch)
 */
function templateOrderCancelled(order, reason, baseUrl = 'http://localhost:3000') {
  const recipientName = escapeHtml(getRecipientName(order));
  const orderCode = escapeHtml(order.orderCode);
  const cancelReason = escapeHtml(reason || 'Theo yêu cầu từ quý khách hoặc lý do kỹ thuật ngoài ý muốn');
  const phone = escapeHtml(order.phone);

  const content = `
    <h2 style="font-size: 20px; font-weight: 800; color: #991B1B; margin-top: 0;">Thông báo hủy đơn hàng #${orderCode}</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #4B5563;">
      Xin chào <strong>${recipientName}</strong>,<br>
      Craft3D rất tiếc phải thông báo đơn hàng <strong>#${orderCode}</strong> của bạn đã được chuyển sang trạng thái <strong>ĐÃ HỦY</strong>.
    </p>

    <div class="order-box" style="background-color: #FEF2F2; border-color: #FECACA;">
      <table style="width: 100%; font-size: 13px;">
        <tr>
          <td style="color: #6B7280; padding: 4px 0;">Mã đơn hàng:</td>
          <td style="font-weight: 800; color: #991B1B; font-family: monospace; text-align: right;">${orderCode}</td>
        </tr>
        <tr>
          <td style="color: #6B7280; padding: 4px 0;">Lý do hủy đơn:</td>
          <td style="font-weight: 600; color: #1E2229; text-align: right;">${cancelReason}</td>
        </tr>
        <tr>
          <td style="color: #6B7280; padding: 4px 0;">Tồn kho:</td>
          <td style="font-weight: 600; color: #166534; text-align: right;">Đã hoàn lại kho sản phẩm</td>
        </tr>
      </table>
    </div>

    <div class="info-box">
      <p style="font-size: 12px; color: #4B5563; line-height: 1.6; margin: 0;">
        📌 <strong>Chính sách xử lý thanh toán:</strong><br>
        • Nếu bạn đặt hàng theo hình thức COD, bạn không cần phải thanh toán bất kỳ khoản phí nào.<br>
        • Nếu bạn đã thanh toán qua SePay VietQR, nhân viên chăm sóc khách hàng của Craft3D sẽ chủ động liên hệ qua điện thoại (${phone}) để hỗ trợ đối soát và hướng dẫn theo đúng chính sách của cửa hàng.
      </p>
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${baseUrl}/shop" class="btn" style="background-color: #4B5563;">
        Tiếp tục mua sắm tại Craft3D
      </a>
    </div>
  `;

  const text = `Craft3D - Thông báo hủy đơn hàng #${order.orderCode}
Xin chào ${getRecipientName(order)},
Đơn hàng #${order.orderCode} đã bị hủy.
Lý do: ${reason || 'Theo yêu cầu từ quý khách'}
Mọi thắc mắc vui lòng liên hệ hotline 0987.654.321.`;

  return {
    subject: `[Craft3D] Thông báo hủy đơn hàng #${order.orderCode}`,
    html: wrapLayout(`Đơn hàng #${order.orderCode} đã hủy`, content),
    text,
  };
}

module.exports = {
  escapeHtml,
  wrapLayout,
  formatVND,
  formatDate,
  templateOrderConfirmation,
  templatePaymentInstructions,
  templatePaymentSuccess,
  templateOrderConfirmed,
  templateOrderShipped,
  templateOrderDelivered,
  templateOrderCancelled,
};
