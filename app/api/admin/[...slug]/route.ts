import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/utils/authOptions";

const BACKEND_BASE = process.env.INTERNAL_API_BASE_URL || "http://localhost:3001";
const ADMIN_API_KEY = process.env.ADMIN_API_KEY || "";

/**
 * Next.js Server-Side Route Handler Proxy for Admin APIs
 * Architecture: Zero-Trust Client
 * 1. Authenticates incoming browser request via httpOnly NextAuth session cookie
 * 2. Strictly enforces session.user.role === 'admin'
 * 3. Enforces CSRF check on mutating methods
 * 4. Injects dedicated ADMIN_API_KEY strictly server-to-server (never leaked to browser)
 * 5. Proxies request to Express backend
 */
async function proxyAdminRequest(req: NextRequest, params: { slug: string[] }) {
  // 1. Authenticate session with NextAuth
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        details: "Yêu cầu đăng nhập tài khoản để thực hiện thao tác này.",
      },
      { status: 401 }
    );
  }

  if ((session as any)?.user?.role !== "admin") {
    return NextResponse.json(
      {
        error: "Forbidden",
        details: "Tài khoản của bạn không có quyền quản trị viên (Admin).",
      },
      { status: 403 }
    );
  }

  // Fail closed if server ADMIN_API_KEY is not configured or weak
  if (!ADMIN_API_KEY || ADMIN_API_KEY.length < 16) {
    console.error("[AdminProxy] Missing or weak ADMIN_API_KEY configuration on server");
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: "Cấu hình bảo mật hệ thống quản trị chưa hoàn thiện (fail closed).",
      },
      { status: 500 }
    );
  }

  // 2. CSRF Defense for mutating methods
  const method = req.method.toUpperCase();
  if (["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.host !== host) {
          return NextResponse.json(
            { error: "Forbidden", details: "Cross-Site Request Forgery (CSRF) validation failed" },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "Forbidden", details: "Invalid request origin" },
          { status: 403 }
        );
      }
    }
  }

  // 3. Construct target URL
  const pathSegment = (params.slug || []).join("/");
  const url = new URL(req.url);
  const targetUrl = `${BACKEND_BASE}/api/admin/${pathSegment}${url.search}`;

  // 4. Read request body if present
  let bodyData: any = undefined;
  if (["POST", "PATCH", "PUT"].includes(method)) {
    try {
      bodyData = await req.json();
    } catch {
      bodyData = undefined;
    }
  }

  // 5. Forward request with secure server-to-server credentials
  try {
    const backendRes = await fetch(targetUrl, {
      method,
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": ADMIN_API_KEY,
        "x-user-email": (session as any)?.user?.email || "",
        "x-user-id": (session as any)?.user?.id || "",
      },
      body: bodyData ? JSON.stringify(bodyData) : undefined,
    });

    const contentType = backendRes.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await backendRes.json();
      return NextResponse.json(data, { status: backendRes.status });
    } else {
      const text = await backendRes.text();
      return new NextResponse(text, {
        status: backendRes.status,
        headers: { "Content-Type": contentType },
      });
    }
  } catch (err: any) {
    console.error("[AdminProxy] Error connecting to backend:", err.message);
    return NextResponse.json(
      {
        error: "Bad Gateway",
        details: "Không thể kết nối tới dịch vụ quản trị backend",
      },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const resolvedParams = await params;
  return proxyAdminRequest(req, resolvedParams);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const resolvedParams = await params;
  return proxyAdminRequest(req, resolvedParams);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const resolvedParams = await params;
  return proxyAdminRequest(req, resolvedParams);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const resolvedParams = await params;
  return proxyAdminRequest(req, resolvedParams);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  const resolvedParams = await params;
  return proxyAdminRequest(req, resolvedParams);
}
