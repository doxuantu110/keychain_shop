import { z } from "zod";
import { commonValidations } from "./validation";

// Comprehensive Vietnamese Customer Registration Schema
export const registrationSchema = z
  .object({
    name: commonValidations.name,
    lastname: commonValidations.lastname,
    email: commonValidations.email,
    phone: commonValidations.phone,
    password: commonValidations.password,
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu"),
    address: commonValidations.address,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

// Login schema (for future use)
export const loginSchema = z.object({
  email: commonValidations.email,
  password: z.string().min(1, "Mật khẩu là bắt buộc"),
});

// Generic validation schema (keeping existing for backward compatibility)
const schema = z.object({
  name: z.string().min(3),
  email: z.string().email()
});

export default schema;