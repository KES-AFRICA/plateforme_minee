"use client";

import { NotificationDetail } from "@/lib/api/notification-details-data";
import { NotificationListItem } from "./notification-list-item";

interface NotificationGroupProps {
  date: string;
  notifications: NotificationDetail[];
  onSelect: (notification: NotificationDetail) => void;
  selectedId?: string;
  language: string;
}

export function NotificationGroup({
  date,
  notifications,
  onSelect,
  selectedId,
  language,
}: NotificationGroupProps) {
  return (
    <div className="space-y-1">
      <div className="px-4 py-2 text-xs font-semibold text-muted-foreground sticky top-0 bg-muted/50 backdrop-blur">
        {date}
      </div>
      <div className="space-y-px">
        {notifications.map((notification) => (
          <NotificationListItem
            key={notification.id}
            notification={notification}
            isSelected={selectedId === notification.id}
            onClick={onSelect}
            language={language}
          />
        ))}
      </div>
    </div>
  );
}