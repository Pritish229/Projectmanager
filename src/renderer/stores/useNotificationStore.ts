import { create } from 'zustand'

interface NotificationItem {
  id: string
  type: string
  title: string
  message: string
  projectId: string | null
  read: boolean
  createdAt: string
}

interface NotificationState {
  notifications: NotificationItem[]
  unreadCount: number
  loading: boolean
  fetchNotifications: (unreadOnly?: boolean) => Promise<void>
  fetchUnreadCount: () => Promise<void>
  markRead: (id: string) => Promise<void>
  markAllRead: () => Promise<void>
  checkDeadlines: () => Promise<void>
  deleteNotification: (id: string) => Promise<void>
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,

  fetchNotifications: async (unreadOnly) => {
    set({ loading: true })
    try {
      const notifications = await window.api.notifications.getAll(unreadOnly)
      set({ notifications, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  fetchUnreadCount: async () => {
    const count = await window.api.notifications.getUnreadCount()
    set({ unreadCount: count })
  },

  markRead: async (id) => {
    await window.api.notifications.markRead(id)
    await get().fetchNotifications()
    await get().fetchUnreadCount()
  },

  markAllRead: async () => {
    await window.api.notifications.markAllRead()
    await get().fetchNotifications()
    set({ unreadCount: 0 })
  },

  checkDeadlines: async () => {
    await window.api.notifications.checkDeadlines()
    await get().fetchUnreadCount()
  },

  deleteNotification: async (id) => {
    await window.api.notifications.delete(id)
    await get().fetchNotifications()
    await get().fetchUnreadCount()
  }
}))
