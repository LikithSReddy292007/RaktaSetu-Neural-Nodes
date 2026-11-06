import { Request, Response } from 'express';
import { DataStore } from '../services/store.js';

export async function getUserNotifications(req: Request, res: Response): Promise<void> {
  const userId = req.user?.id || (req.query.userId as string);
  if (!userId) {
    res.status(400).json({ success: false, message: 'User ID is required.' });
    return;
  }

  const notifications = await DataStore.getNotificationsForUser(userId);
  res.status(200).json({ success: true, count: notifications.length, data: notifications });
}

export async function markAsRead(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const ok = await DataStore.markNotificationRead(id);
  if (!ok) {
    res.status(404).json({ success: false, message: 'Notification not found.' });
    return;
  }
  res.status(200).json({ success: true, message: 'Notification marked as read.' });
}

