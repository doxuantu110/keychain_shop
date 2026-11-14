"use client";

import React from "react";
import { Notification, NotificationType, NotificationPriority } from "@/types/notification";
import {
  FaBagShopping,
  FaCreditCard,
  FaTag,
  FaTriangleExclamation,
  FaCheck,
  FaTrash,
  FaCircle
} from "react-icons/fa6";

const formatTimeAgo = (date: string) => {
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

  if (diffInSeconds < 60) return "Vừa xong";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
  return past.toLocaleDateString("vi-VN");
};

interface NotificationCardProps {
  notification: Notification;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const getTypeIcon = (type: NotificationType) => {
  switch (type) {
    case NotificationType.ORDER_UPDATE:
      return <FaBagShopping className="text-[#E06D53]" />;
    case NotificationType.PAYMENT_STATUS:
      return <FaCreditCard className="text-emerald-500" />;
    case NotificationType.PROMOTION:
      return <FaTag className="text-amber-500" />;
    case NotificationType.SYSTEM_ALERT:
      return <FaTriangleExclamation className="text-rose-500" />;
    default:
      return <FaCircle className="text-gray-400" />;
  }
};

const getTypeLabel = (type: NotificationType) => {
  switch (type) {
    case NotificationType.ORDER_UPDATE:
      return "Đơn hàng";
    case NotificationType.PAYMENT_STATUS:
      return "Thanh toán";
    case NotificationType.PROMOTION:
      return "Ưu đãi";
    case NotificationType.SYSTEM_ALERT:
      return "Hệ thống";
    default:
      return "Thông báo";
  }
};

const getTypeBadgeColor = (type: NotificationType) => {
  switch (type) {
    case NotificationType.ORDER_UPDATE:
      return "bg-[#FDF2EE] text-[#E06D53] border-[#E06D53]/20";
    case NotificationType.PAYMENT_STATUS:
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case NotificationType.PROMOTION:
      return "bg-amber-50 text-amber-700 border-amber-200";
    case NotificationType.SYSTEM_ALERT:
      return "bg-rose-50 text-rose-700 border-rose-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

const getPriorityBadge = (priority: NotificationPriority) => {
  const priorityLabels = {
    [NotificationPriority.LOW]: "Thấp",
    [NotificationPriority.NORMAL]: "Tiêu chuẩn",
    [NotificationPriority.HIGH]: "Cao",
    [NotificationPriority.URGENT]: "Khẩn cấp"
  };

  const priorityStyles = {
    [NotificationPriority.LOW]: "bg-gray-100 text-gray-600",
    [NotificationPriority.NORMAL]: "bg-blue-50 text-blue-700",
    [NotificationPriority.HIGH]: "bg-amber-50 text-amber-700",
    [NotificationPriority.URGENT]: "bg-rose-50 text-rose-700 font-bold"
  };

  return (
    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${priorityStyles[priority]}`}>
      {priorityLabels[priority]}
    </span>
  );
};

const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  isSelected,
  onToggleSelect,
  onMarkAsRead,
  onDelete
}) => {
  const timeAgo = formatTimeAgo(notification.createdAt);

  return (
    <div className={`
      border rounded-2xl p-4 sm:p-5 transition-all duration-200 hover:shadow-sm
      ${notification.isRead ? "bg-white border-gray-200" : "bg-[#FFFDF9] border-[#E06D53]/30 shadow-xs"}
      ${isSelected ? "ring-2 ring-[#E06D53] border-[#E06D53]" : ""}
    `}>
      <div className="flex items-start space-x-3">
        <div className="flex items-center pt-1">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(notification.id)}
            className="w-4 h-4 text-[#1E2229] bg-gray-100 border-gray-300 rounded focus:ring-[#E06D53]"
            aria-label={`Chọn thông báo: ${notification.title}`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-1.5 gap-2">
            <div className="flex items-center space-x-2 flex-1">
              <div className="flex-shrink-0 text-base">
                {getTypeIcon(notification.type)}
              </div>
              <h3 className={`text-xs sm:text-sm truncate ${notification.isRead ? "text-gray-900 font-medium" : "text-[#1E2229] font-bold"
                }`}>
                {notification.title}
              </h3>
              {!notification.isRead && (
                <div className="w-2 h-2 bg-[#E06D53] rounded-full flex-shrink-0" title="Chưa đọc" />
              )}
            </div>

            <div className="flex-shrink-0">
              {getPriorityBadge(notification.priority)}
            </div>
          </div>

          <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2 leading-relaxed">
            {notification.message}
          </p>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
            <div className="flex items-center space-x-3">
              <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${getTypeBadgeColor(notification.type)}`}>
                {getTypeLabel(notification.type)}
              </span>
              <span className="text-[11px] text-gray-400">
                {timeAgo}
              </span>
            </div>

            <div className="flex items-center space-x-2">
              {!notification.isRead && (
                <button
                  onClick={() => onMarkAsRead(notification.id)}
                  className="inline-flex items-center px-2 py-1 text-[11px] font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <FaCheck className="w-2.5 h-2.5 mr-1 text-emerald-600" />
                  Đã đọc
                </button>
              )}

              <button
                onClick={() => onDelete(notification.id)}
                className="inline-flex items-center px-2 py-1 text-[11px] font-semibold text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors"
              >
                <FaTrash className="w-2.5 h-2.5 mr-1" />
                Xóa
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationCard;