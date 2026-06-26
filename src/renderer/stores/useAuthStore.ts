import { create } from 'zustand'
import { useSettingsStore } from './useSettingsStore'

interface AuthState {
  isAuthenticated: boolean
  isPinSet: boolean | null
  checkSecurityStatus: () => Promise<void>
  setupSecurity: (pin: string, securityPassword: string) => Promise<void>
  authenticate: (pin: string) => Promise<boolean>
  resetPinWithPassword: (password: string, newPin: string, newPassword?: string) => Promise<boolean>
  changePin: (oldPin: string, newPin: string) => Promise<boolean>
  changeSecurityPassword: (oldPassword: string, newPassword: string) => Promise<boolean>
  logout: () => void
}

export async function hashString(str: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(str)
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isPinSet: null,

  checkSecurityStatus: async () => {
    const { settings, fetchSettings } = useSettingsStore.getState()
    if (Object.keys(settings).length === 0) {
      await fetchSettings()
    }
    const currentSettings = useSettingsStore.getState().settings
    const hasPin = !!currentSettings.security_pin_hash
    set({ isPinSet: hasPin })
  },

  setupSecurity: async (pin, securityPassword) => {
    const pinHash = await hashString(pin)
    const passwordHash = await hashString(securityPassword)

    const { updateSettings } = useSettingsStore.getState()
    await updateSettings({
      security_pin_hash: pinHash,
      security_password_hash: passwordHash
    })

    set({ isAuthenticated: true, isPinSet: true })
  },

  authenticate: async (pin) => {
    const { settings } = useSettingsStore.getState()
    const storedPinHash = settings.security_pin_hash
    if (!storedPinHash) return false

    const enteredPinHash = await hashString(pin)
    if (enteredPinHash === storedPinHash) {
      set({ isAuthenticated: true })
      return true
    }
    return false
  },

  resetPinWithPassword: async (password, newPin, newPassword) => {
    const { settings, updateSettings } = useSettingsStore.getState()
    const storedPasswordHash = settings.security_password_hash
    if (!storedPasswordHash) return false

    const enteredPasswordHash = await hashString(password)
    if (enteredPasswordHash === storedPasswordHash) {
      const newPinHash = await hashString(newPin)
      const updates: Record<string, string> = {
        security_pin_hash: newPinHash
      }
      if (newPassword) {
        updates.security_password_hash = await hashString(newPassword)
      }
      await updateSettings(updates)
      set({ isAuthenticated: true, isPinSet: true })
      return true
    }
    return false
  },

  changePin: async (oldPin, newPin) => {
    const { settings, updateSetting } = useSettingsStore.getState()
    const storedPinHash = settings.security_pin_hash
    if (!storedPinHash) return false

    const enteredOldPinHash = await hashString(oldPin)
    if (enteredOldPinHash === storedPinHash) {
      const newPinHash = await hashString(newPin)
      await updateSetting('security_pin_hash', newPinHash)
      return true
    }
    return false
  },

  changeSecurityPassword: async (oldPassword, newPassword) => {
    const { settings, updateSetting } = useSettingsStore.getState()
    const storedPasswordHash = settings.security_password_hash
    if (!storedPasswordHash) return false

    const enteredOldPasswordHash = await hashString(oldPassword)
    if (enteredOldPasswordHash === storedPasswordHash) {
      const newPasswordHash = await hashString(newPassword)
      await updateSetting('security_password_hash', newPasswordHash)
      return true
    }
    return false
  },

  logout: () => {
    set({ isAuthenticated: false })
  }
}))
