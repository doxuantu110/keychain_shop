import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getServerSession } from "next-auth/next";
import 'svgmap/dist/svgMap.min.css';
import SessionProvider from "@/utils/SessionProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Providers from "@/Providers";
import SessionTimeoutWrapper from "@/components/SessionTimeoutWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Craft3D – Móc Khóa In 3D & Phụ Kiện Cá Nhân Hóa Độc Đáo",
  description: "Khám phá thế giới móc khóa in 3D, móc khóa tên khắc theo yêu cầu, bảng tên và phụ kiện sáng tạo. Thiết kế riêng, hoàn thiện tỉ mỉ, giao hàng toàn quốc.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession();
  return (
    <html lang="vi" data-theme="light">
      <body className={`${inter.className} min-h-screen flex flex-col bg-[#FAF9F6] text-[#18181B]`}>
        <SessionProvider session={session}>
          <SessionTimeoutWrapper />
          <Header />
          <Providers>
            <main className="flex-1">
              {children}
            </main>
          </Providers>
          <Footer />
        </SessionProvider>
      </body>
    </html>
  );
}
