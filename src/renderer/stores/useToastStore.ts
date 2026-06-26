import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  title: string
  description?: string
  type: ToastType
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  toast: (toast: Omit<Toast, 'id'>) => void
  removeToast: (id: string) => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  toast: (newToast) => {
    const id = Math.random().toString(36).substring(2, 9)
    const duration = newToast.duration ?? 4000

    set((state) => ({
      toasts: [...state.toasts, { ...newToast, id, duration }]
    }))

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id)
        }))
      }, duration)
    }
  },
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id)
    }))
  }
}))

export const toast = {
  success: (title: string, description?: string, duration?: number) =>
    useToastStore.getState().toast({ title, description, type: 'success', duration }),
  error: (title: string, description?: string, duration?: number) =>
    useToastStore.getState().toast({ title, description, type: 'error', duration }),
  info: (title: string, description?: string, duration?: number) =>
    useToastStore.getState().toast({ title, description, type: 'info', duration }),
  warning: (title: string, description?: string, duration?: number) =>
    useToastStore.getState().toast({ title, description, type: 'warning', duration })
}
