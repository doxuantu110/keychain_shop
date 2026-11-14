import prisma from "@/utils/db";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { registrationSchema } from "@/utils/schema";
import { sanitizeInput, commonValidations } from "@/utils/validation";
import { handleApiError, AppError } from "@/utils/errorHandler";

export const POST = async (request: Request) => {
  try {
    // Get client IP for rate limiting
    const clientIP = request.headers.get("x-forwarded-for") ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Check rate limit
    if (!commonValidations.checkRateLimit(clientIP, 5, 15 * 60 * 1000)) {
      throw new AppError("Too many registration attempts. Please try again later.", 429);
    }

    const body = await sanitizeInput.validateJsonInput(request);

    const validationResult = registrationSchema.safeParse(body);

    if (!validationResult.success) {
      throw validationResult.error;
    }

    const { name, lastname, email, phone, password, address } = validationResult.data;

    const existingUser = await prisma.user.findFirst({
      where: { email: email.toLowerCase().trim() }
    });

    if (existingUser) {
      throw new AppError("Email này đã được sử dụng. Vui lòng đăng nhập hoặc dùng email khác.", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 14);

    // Create user with proper error handling and complete profile
    const newUser = await prisma.user.create({
      data: {
        id: nanoid(),
        name: name.trim(),
        lastname: lastname.trim(),
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        address: address ? address.trim() : null,
        password: hashedPassword,
        role: "user",
      },
    });

    // Return success response without sensitive data
    return new NextResponse(
      JSON.stringify({
        message: "Đăng ký tài khoản thành công",
        userId: newUser.id
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (error) {
    return handleApiError(error);
  }
};
