import { prisma } from "@/lib/db";
import { NotificationStatus } from "@prisma/client";

export interface NotificationAlertItem {
  id: string;
  title: string;
  titleBn?: string | null;
  message: string;
  messageBn?: string | null;
  type: string;
  category: string;
  createdAt: string;
  link?: string | null;
  readAt?: string | null;
}

export interface NotificationSummary {
  unreadCount: number;
  alerts: NotificationAlertItem[];
}

const baseNotificationWhere = {
  recipientType: "user",
  isArchived: false,
  deletedAt: null,
} as const;

export class NotificationService {
  static async getUserNotifications(
    userId: string,
    limit = 6
  ): Promise<NotificationSummary> {
    const where = {
      ...baseNotificationWhere,
      recipientId: userId,
    };

    const [unreadCount, notifications] = await Promise.all([
      prisma.notification.count({
        where: {
          ...where,
          readAt: null,
        },
      }),
      prisma.notification.findMany({
        where,
        orderBy: [{ createdAt: "desc" }],
        take: limit,
        select: {
          id: true,
          title: true,
          titleBn: true,
          message: true,
          messageBn: true,
          type: true,
          category: true,
          createdAt: true,
          link: true,
          readAt: true,
        },
      }),
    ]);

    return {
      unreadCount,
      alerts: notifications.map((notification) => ({
        id: notification.id,
        title: notification.title,
        titleBn: notification.titleBn,
        message: notification.message,
        messageBn: notification.messageBn,
        type: notification.type,
        category: notification.category,
        createdAt: notification.createdAt.toISOString(),
        link: notification.link,
        readAt: notification.readAt?.toISOString() ?? null,
      })),
    };
  }

  static async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const existingNotification = await prisma.notification.findFirst({
      where: {
        ...baseNotificationWhere,
        id: notificationId,
        recipientId: userId,
      },
      select: {
        id: true,
        readAt: true,
      },
    });

    if (!existingNotification) {
      return false;
    }

    if (existingNotification.readAt) {
      return true;
    }

    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        readAt: new Date(),
        status: NotificationStatus.READ,
      },
    });

    return true;
  }
}
