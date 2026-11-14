import config from './config';

export const apiClient = {
  baseUrl: config.apiBaseUrl,

  async request(endpoint: string, options: RequestInit = {}) {
    // Security: In browser, route admin calls via Next.js server proxy (/api/admin/...)
    // so authentication relies strictly on httpOnly NextAuth session cookie (Zero Client Secret Exposure)
    let url: string;
    const method = (options.method || 'GET').toUpperCase();
    const isAdminMutatingEndpoint =
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) &&
      (endpoint.startsWith('/api/products') ||
        endpoint.startsWith('/api/categories') ||
        endpoint.startsWith('/api/merchants') ||
        endpoint.startsWith('/api/users') ||
        endpoint.startsWith('/api/bulk-upload'));

    if (typeof window !== 'undefined') {
      if (endpoint.startsWith('/api/admin')) {
        url = endpoint;
      } else if (isAdminMutatingEndpoint) {
        url = `/api/admin${endpoint.replace('/api', '')}`;
      } else {
        url = `${this.baseUrl}${endpoint}`;
      }
    } else {
      url = `${this.baseUrl}${endpoint}`;
    }

    const defaultHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    const customHeaders = (options.headers as Record<string, string>) || {};
    const mergedHeaders = {
      ...defaultHeaders,
      ...customHeaders,
    };

    return fetch(url, {
      credentials: 'same-origin',
      ...options,
      headers: mergedHeaders,
    });
  },

  // Convenience methods
  get: (endpoint: string, options?: RequestInit) =>
    apiClient.request(endpoint, { ...options, method: 'GET' }),

  post: (endpoint: string, data?: any, options?: RequestInit) =>
    apiClient.request(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: (endpoint: string, data?: any, options?: RequestInit) =>
    apiClient.request(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: (endpoint: string, data?: any, options?: RequestInit) =>
    apiClient.request(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: (endpoint: string, options?: RequestInit) =>
    apiClient.request(endpoint, { ...options, method: 'DELETE' }),
};

export default apiClient;
