// Server-side validation utilities for payment and order processing
const prisma = require('./db');

// Validation error class
class ValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

// Payment validation utilities
const paymentValidation = {
  // Validate credit card number using Luhn algorithm
  validateCardNumber: (cardNumber) => {
    if (!cardNumber || typeof cardNumber !== 'string') {
      throw new ValidationError('Card number is required', 'cardNumber');
    }

    // Remove all non-digit characters
    const cleanedNumber = cardNumber.replace(/[^0-9]/g, '');
    
    // Check length (13-19 digits)
    if (cleanedNumber.length < 13 || cleanedNumber.length > 19) {
      throw new ValidationError('Card number must be between 13 and 19 digits', 'cardNumber');
    }

    // Luhn algorithm validation
    let sum = 0;
    let isEven = false;
    
    for (let i = cleanedNumber.length - 1; i >= 0; i--) {
      let digit = parseInt(cleanedNumber[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    if (sum % 10 !== 0) {
      throw new ValidationError('Invalid card number', 'cardNumber');
    }
    
    return cleanedNumber;
  },

  // Validate CVV/CVC
  validateCVV: (cvv, cardNumber) => {
    if (!cvv || typeof cvv !== 'string') {
      throw new ValidationError('CVV is required', 'cvv');
    }

    const cleanedCVV = cvv.replace(/[^0-9]/g, '');
    
    // American Express cards have 4-digit CVV, others have 3-digit
    const cleanedCardNumber = cardNumber ? cardNumber.replace(/[^0-9]/g, '') : '';
    const isAmex = cleanedCardNumber.startsWith('34') || cleanedCardNumber.startsWith('37');
    const expectedLength = isAmex ? 4 : 3;
    
    if (cleanedCVV.length !== expectedLength) {
      throw new ValidationError(`CVV must be ${expectedLength} digits`, 'cvv');
    }
    
    if (!/^[0-9]+$/.test(cleanedCVV)) {
      throw new ValidationError('CVV must contain only numbers', 'cvv');
    }
    
    return cleanedCVV;
  },

  // Validate expiration date
  validateExpirationDate: (expDate) => {
    if (!expDate || typeof expDate !== 'string') {
      throw new ValidationError('Expiration date is required', 'expDate');
    }

    // Accept MM/YY, MM/YYYY, MM-YY, MM-YYYY formats
    const cleanedDate = expDate.replace(/[^0-9]/g, '');
    
    if (cleanedDate.length !== 4 && cleanedDate.length !== 6) {
      throw new ValidationError('Expiration date must be in MM/YY or MM/YYYY format', 'expDate');
    }

    const month = parseInt(cleanedDate.substring(0, 2));
    const year = parseInt(cleanedDate.substring(2));
    const fullYear = year < 100 ? 2000 + year : year;
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    if (month < 1 || month > 12) {
      throw new ValidationError('Invalid month in expiration date', 'expDate');
    }

    if (fullYear < currentYear || (fullYear === currentYear && month < currentMonth)) {
      throw new ValidationError('Card has expired', 'expDate');
    }

    return { month, year: fullYear };
  },

  // Validate cardholder name
  validateCardholderName: (name) => {
    if (!name || typeof name !== 'string') {
      throw new ValidationError('Cardholder name is required', 'cardholderName');
    }

    const trimmedName = name.trim();
    
    if (trimmedName.length < 2) {
      throw new ValidationError('Cardholder name must be at least 2 characters', 'cardholderName');
    }

    if (trimmedName.length > 50) {
      throw new ValidationError('Cardholder name must be less than 50 characters', 'cardholderName');
    }

    // Allow letters, spaces, hyphens, and apostrophes
    if (!/^[a-zA-Z\s\-']+$/.test(trimmedName)) {
      throw new ValidationError('Cardholder name contains invalid characters', 'cardholderName');
    }

    return trimmedName;
  }
};

// Order validation utilities
const orderValidation = {
  // Validate email format - FIXED: Check XSS patterns first
  validateEmail: (email) => {
    if (!email || typeof email !== 'string') {
      throw new ValidationError('Email is required', 'email');
    }

    const trimmedEmail = email.trim().toLowerCase();
    
    // Check for suspicious patterns FIRST (before format validation)
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /data:/i,
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(trimmedEmail))) {
      throw new ValidationError('Email contains invalid characters', 'email');
    }
    
    if (trimmedEmail.length > 254) {
      throw new ValidationError('Email must be less than 254 characters', 'email');
    }

    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(trimmedEmail)) {
      throw new ValidationError('Invalid email format', 'email');
    }

    return trimmedEmail;
  },

  // Validate name format - Updated to support Unicode and Indonesian names
  validateName: (name, fieldName = 'name') => {
    if (!name || typeof name !== 'string') {
      throw new ValidationError(`${fieldName} is required`, fieldName);
    }

    const trimmedName = name.trim();
    
    if (trimmedName.length < 2) {
      throw new ValidationError(`${fieldName} must be at least 2 characters`, fieldName);
    }

    if (trimmedName.length > 50) {
      throw new ValidationError(`${fieldName} must be less than 50 characters`, fieldName);
    }

    // Check for dangerous patterns first
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /data:/i,
      /<\w+[^>]*>/,
    ];
    
    if (dangerousPatterns.some(pattern => pattern.test(trimmedName))) {
      throw new ValidationError(`${fieldName} contains invalid characters`, fieldName);
    }

    // Allow Unicode letters, spaces, hyphens, apostrophes, and dots
    // This supports international names including Indonesian, Arabic, Chinese, etc.
    if (!/^[\p{L}\p{M}\s\-'.]+$/u.test(trimmedName)) {
      throw new ValidationError(`${fieldName} contains invalid characters`, fieldName);
    }

    return trimmedName;
  },

  // Validate phone number
  validatePhone: (phone) => {
    if (!phone || typeof phone !== 'string') {
      throw new ValidationError('Phone number is required', 'phone');
    }

    const cleanedPhone = phone.replace(/[^0-9+\-\(\)\s]/g, '');
    
    if (cleanedPhone.length < 10) {
      throw new ValidationError('Phone number must be at least 10 digits', 'phone');
    }

    if (cleanedPhone.length > 20) {
      throw new ValidationError('Phone number must be less than 20 characters', 'phone');
    }

    return cleanedPhone;
  },

  // Validate address fields - UPDATED for apartment (1 character minimum)
  validateAddress: (address, fieldName = 'address') => {
    if (!address || typeof address !== 'string') {
      throw new ValidationError(`${fieldName} is required`, fieldName);
    }

    const trimmedAddress = address.trim();
    
    // Special case for apartment - only 1 character minimum
    const minLength = fieldName === 'apartment' ? 1 : 5;
    
    if (trimmedAddress.length < minLength) {
      throw new ValidationError(`${fieldName} must be at least ${minLength} characters`, fieldName);
    }

    if (trimmedAddress.length > 200) {
      throw new ValidationError(`${fieldName} must be less than 200 characters`, fieldName);
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /data:/i,
    ];
    
    if (suspiciousPatterns.some(pattern => pattern.test(trimmedAddress))) {
      throw new ValidationError(`${fieldName} contains invalid characters`, fieldName);
    }

    return trimmedAddress;
  },

  // Validate postal code
  validatePostalCode: (postalCode) => {
    if (!postalCode || typeof postalCode !== 'string') {
      throw new ValidationError('Postal code is required', 'postalCode');
    }

    const trimmedCode = postalCode.trim();
    
    if (trimmedCode.length < 3) {
      throw new ValidationError('Postal code must be at least 3 characters', 'postalCode');
    }

    if (trimmedCode.length > 20) {
      throw new ValidationError('Postal code must be less than 20 characters', 'postalCode');
    }

    return trimmedCode;
  },

  // Validate total amount
  validateTotal: (total) => {
    if (total === null || total === undefined) {
      throw new ValidationError('Total amount is required', 'total');
    }

    const numTotal = parseFloat(total);
    
    if (isNaN(numTotal)) {
      throw new ValidationError('Total must be a valid number', 'total');
    }

    if (numTotal <= 0) {
      throw new ValidationError('Total must be greater than 0', 'total');
    }

    if (numTotal > 999999.99) {
      throw new ValidationError('Total amount is too large', 'total');
    }

    return Math.round(numTotal * 100) / 100; // Round to 2 decimal places
  },

  // Validate order status
  validateStatus: (status) => {
    const validStatuses = [
      'pending', 
      'pending_payment', 
      'confirmed', 
      'processing', 
      'shipped', 
      'delivered', 
      'cancelled'
    ];
    
    if (!status || typeof status !== 'string') {
      throw new ValidationError('Order status is required', 'status');
    }

    if (!validStatuses.includes(status.toLowerCase())) {
      throw new ValidationError(`Invalid order status. Must be one of: ${validStatuses.join(', ')}`, 'status');
    }

    return status.toLowerCase();
  },

  // Validate custom QR Code URL (Phase 3.6: SSRF & XSS Protection)
  validateQrUrl: (url) => {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (trimmed.length === 0) return null;
    if (trimmed.length > 500) {
      throw new ValidationError('Mã QR URL không được vượt quá 500 ký tự', 'customQrUrl');
    }
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new ValidationError('Mã QR URL phải bắt đầu bằng http:// hoặc https://', 'customQrUrl');
      }
      return trimmed;
    } catch (e) {
      if (e instanceof ValidationError) throw e;
      throw new ValidationError('Định dạng mã QR URL không hợp lệ (phải bắt đầu bằng http:// hoặc https://)', 'customQrUrl');
    }
  }
};

// Shipping fee calculation service - Controlled 100% by backend
const calculateShippingFee = (subtotal) => {
  const numericSubtotal = Math.max(0, parseInt(subtotal, 10) || 0);
  // Free shipping policy for orders >= 300,000 VND
  if (numericSubtotal >= 300000) {
    return 0;
  }
  // Standard shipping fee for orders under 300,000 VND
  return 30000;
};

// Validate order items array
const validateOrderItems = (items) => {
  if (!Array.isArray(items)) {
    throw new ValidationError('Items must be an array', 'items');
  }
  if (items.length === 0) {
    throw new ValidationError('Items array cannot be empty', 'items');
  }

  return items.map((item, index) => {
    if (!item || typeof item !== 'object') {
      throw new ValidationError(`Item at index ${index} must be an object`, `items[${index}]`);
    }

    if (!item.productId || typeof item.productId !== 'string' || item.productId.trim().length === 0) {
      throw new ValidationError(`Item at index ${index} requires a valid productId`, `items[${index}].productId`);
    }

    const rawQty = item.quantity;
    if (rawQty === null || rawQty === undefined || rawQty === '') {
      throw new ValidationError(`Item at index ${index} requires a quantity`, `items[${index}].quantity`);
    }

    const quantity = parseInt(rawQty, 10);
    if (isNaN(quantity) || quantity <= 0 || String(rawQty).includes('.')) {
      throw new ValidationError(`Item at index ${index} requires a positive integer quantity`, `items[${index}].quantity`);
    }

    return {
      productId: item.productId.trim(),
      variantId: item.variantId && typeof item.variantId === 'string' && item.variantId.trim().length > 0 
        ? item.variantId.trim() 
        : null,
      quantity,
      customText: item.customText !== undefined && item.customText !== null
        ? String(item.customText).trim()
        : null,
      customFont: item.customFont && typeof item.customFont === 'string' 
        ? item.customFont.trim().substring(0, 100) 
        : null,
      customQrUrl: item.customQrUrl 
        ? orderValidation.validateQrUrl(item.customQrUrl) 
        : null,
    };
  });
};

// Comprehensive order validation - UPDATED for Vietnamese E-Commerce and Personalization
const validateOrderData = (orderData) => {
  const errors = [];
  const validatedData = {};

  if (!orderData || typeof orderData !== 'object') {
    return {
      isValid: false,
      errors: [{ field: 'body', message: 'Request body must be an object' }],
      validatedData
    };
  }

  // Helper function to safely validate a field
  const safeValidate = (validationFn, value, fieldName) => {
    try {
      return validationFn(value, fieldName);
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push({
          field: error.field,
          message: error.message
        });
        return null;
      } else {
        errors.push({
          field: fieldName,
          message: 'Validation error occurred'
        });
        return null;
      }
    }
  };

  // Name handling: Support fullName, name, and lastname
  let name = orderData.name;
  let lastname = orderData.lastname;
  let fullName = orderData.fullName;

  if ((!name || !lastname) && fullName && typeof fullName === 'string' && fullName.trim().length > 0) {
    const trimmedFull = fullName.trim();
    const parts = trimmedFull.split(/\s+/);
    if (parts.length === 1) {
      name = parts[0];
      lastname = parts[0];
    } else {
      name = parts[parts.length - 1];
      lastname = parts.slice(0, -1).join(' ');
    }
  }

  if (!fullName && name) {
    fullName = lastname ? `${lastname} ${name}`.trim() : name.trim();
  }

  validatedData.name = safeValidate(orderValidation.validateName, name, 'name');
  validatedData.lastname = safeValidate(orderValidation.validateName, lastname || name, 'lastname');
  validatedData.fullName = fullName || (validatedData.name && validatedData.lastname ? `${validatedData.lastname} ${validatedData.name}`.trim() : '');
  
  // Required contact fields
  validatedData.email = safeValidate(orderValidation.validateEmail, orderData.email, 'email');
  validatedData.phone = safeValidate(orderValidation.validatePhone, orderData.phone, 'phone');

  // Vietnamese Address fields (Optional / Standardized)
  validatedData.province = orderData.province ? String(orderData.province).trim() : null;
  validatedData.district = orderData.district ? String(orderData.district).trim() : null;
  validatedData.ward = orderData.ward ? String(orderData.ward).trim() : null;
  validatedData.addressDetail = orderData.addressDetail ? String(orderData.addressDetail).trim() : null;

  // Legacy Address fields: Made optional with reasonable defaults
  validatedData.company = orderData.company ? String(orderData.company).trim() : "";
  validatedData.apartment = orderData.apartment ? String(orderData.apartment).trim() : "";
  validatedData.postalCode = orderData.postalCode ? String(orderData.postalCode).trim() : "";
  validatedData.city = orderData.city ? String(orderData.city).trim() : (validatedData.province || "");
  validatedData.country = orderData.country ? String(orderData.country).trim() : "Vietnam";

  const rawAddress = orderData.adress || 
    [validatedData.addressDetail, validatedData.ward, validatedData.district, validatedData.province].filter(Boolean).join(", ");
  
  validatedData.adress = rawAddress ? String(rawAddress).trim() : "";
  if (validatedData.adress.length > 255) {
    errors.push({ field: 'address', message: 'Address must be less than 255 characters' });
  }

  // Payment method and status
  const validPaymentMethods = ['COD', 'SEPAY', 'SEPAY_QR', 'VNPAY', 'PAYOS', 'UNVERIFIED'];
  const pMethod = orderData.paymentMethod ? String(orderData.paymentMethod).toUpperCase().trim() : 'COD';
  validatedData.paymentMethod = validPaymentMethods.includes(pMethod) ? pMethod : 'COD';
  validatedData.paymentStatus = orderData.paymentStatus ? String(orderData.paymentStatus).toUpperCase().trim() : 'PENDING';

  // Audit 5: Bắt buộc items phải là mảng và items.length >= 1 cho checkout mới
  if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
    errors.push({ field: 'items', message: 'Đơn hàng phải có ít nhất một sản phẩm (items không được rỗng)' });
  } else {
    try {
      validatedData.items = validateOrderItems(orderData.items);
    } catch (err) {
      if (err instanceof ValidationError) {
        errors.push({ field: err.field, message: err.message });
      } else {
        errors.push({ field: 'items', message: err.message });
      }
    }
  }

  validatedData.status = safeValidate(orderValidation.validateStatus, orderData.status || 'pending', 'status');
  
  // Optional order notice
  validatedData.orderNotice = orderData.orderNotice ? 
    String(orderData.orderNotice).trim().substring(0, 500) : '';

  return {
    isValid: errors.length === 0,
    errors,
    validatedData
  };
};

// Payment data validation (for future payment integration)
const validatePaymentData = (paymentData) => {
  const errors = [];
  const validatedData = {};

  // Helper function to safely validate payment fields
  const safeValidatePayment = (validationFn, value, fieldName) => {
    try {
      return validationFn(value, paymentData.cardNumber);
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push({
          field: error.field,
          message: error.message
        });
        return null;
      } else {
        errors.push({
          field: fieldName,
          message: 'Payment validation error occurred'
        });
        return null;
      }
    }
  };

  if (paymentData.cardNumber) {
    validatedData.cardNumber = safeValidatePayment(paymentValidation.validateCardNumber, paymentData.cardNumber, 'cardNumber');
  }
  
  if (paymentData.cvv) {
    validatedData.cvv = safeValidatePayment(paymentValidation.validateCVV, paymentData.cvv, 'cvv');
  }
  
  if (paymentData.expDate) {
    try {
      validatedData.expDate = paymentValidation.validateExpirationDate(paymentData.expDate);
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push({
          field: error.field,
          message: error.message
        });
      }
    }
  }
  
  if (paymentData.cardholderName) {
    try {
      validatedData.cardholderName = paymentValidation.validateCardholderName(paymentData.cardholderName);
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push({
          field: error.field,
          message: error.message
        });
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    validatedData
  };
};

module.exports = {
  ValidationError,
  paymentValidation,
  orderValidation,
  validateOrderData,
  validateOrderItems,
  validatePaymentData,
  calculateShippingFee
};
