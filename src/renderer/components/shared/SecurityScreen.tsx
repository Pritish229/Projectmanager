import { useState, useEffect, useRef } from 'react'
import { useAuthStore, hashString } from '@/stores/useAuthStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { cn } from '@/lib/utils'
import { Lock, ShieldAlert, KeyRound, Eye, EyeOff, ArrowLeft } from 'lucide-react'

interface SecurityScreenProps {
  mode?: 'lock' | 'setup' | 'reset'
  onSuccess?: () => void
}

export function SecurityScreen({ mode: initialMode = 'lock', onSuccess }: SecurityScreenProps) {
  const {
    authenticate,
    setupSecurity,
    resetPinWithPassword,
  } = useAuthStore()

  const [mode, setMode] = useState<'lock' | 'setup' | 'reset'>(initialMode)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // PIN inputs
  const [pin, setPin] = useState('')
  const [isShaking, setIsShaking] = useState(false)

  // Setup mode states
  const [setupStep, setSetupStep] = useState<1 | 2 | 3>(1) // 1: Enter PIN, 2: Confirm PIN, 3: Set Security Password
  const [setupPin, setSetupPin] = useState('')
  const [setupConfirmPin, setSetupConfirmPin] = useState('')
  const [securityPassword, setSecurityPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)

  // Reset mode states
  const [resetStep, setResetStep] = useState<1 | 2>(1) // 1: Enter Security Password, 2: Set New PIN
  const [resetPassword, setResetPassword] = useState('')
  const [resetNewPin, setResetNewPin] = useState('')
  const [resetConfirmPin, setResetConfirmPin] = useState('')

  // Refs for hidden inputs to manage keyboard focus
  const pinInputRef = useRef<HTMLInputElement>(null)
  const setupPinInputRef = useRef<HTMLInputElement>(null)
  const setupConfirmPinInputRef = useRef<HTMLInputElement>(null)
  const resetPinInputRef = useRef<HTMLInputElement>(null)
  const resetConfirmPinInputRef = useRef<HTMLInputElement>(null)

  // Keep focus on input for the lock screen
  useEffect(() => {
    if (mode === 'lock') {
      pinInputRef.current?.focus()
    } else if (mode === 'setup') {
      if (setupStep === 1) setupPinInputRef.current?.focus()
      else if (setupStep === 2) setupConfirmPinInputRef.current?.focus()
    } else if (mode === 'reset') {
      if (resetStep === 2) resetPinInputRef.current?.focus()
    }
  }, [mode, setupStep, resetStep])

  // Automatically authenticate when PIN reaches 6 digits on Lock screen
  useEffect(() => {
    if (mode === 'lock' && pin.length === 6) {
      handleUnlock()
    }
  }, [pin, mode])

  // Automatically advance steps in Setup/Reset PIN stages when 6 digits are entered
  useEffect(() => {
    if (mode === 'setup') {
      if (setupStep === 1 && setupPin.length === 6) {
        setError(null)
        setSetupStep(2)
      } else if (setupStep === 2 && setupConfirmPin.length === 6) {
        if (setupPin !== setupConfirmPin) {
          setError('PINs do not match. Try again.')
          setSetupConfirmPin('')
          setIsShaking(true)
          setTimeout(() => setIsShaking(false), 500)
        } else {
          setError(null)
          setSetupStep(3)
        }
      }
    }
  }, [setupPin, setupConfirmPin, setupStep, mode])

  const handleUnlock = async () => {
    setIsLoading(true)
    setError(null)
    const success = await authenticate(pin)
    if (success) {
      setIsLoading(false)
      onSuccess?.()
    } else {
      setIsLoading(false)
      setIsShaking(true)
      setError('Incorrect PIN. Please try again.')
      setPin('')
      setTimeout(() => {
        setIsShaking(false)
        pinInputRef.current?.focus()
      }, 500)
    }
  }

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (securityPassword.length < 8) {
      setError('Security password must be at least 8 characters long.')
      return
    }

    if (securityPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsLoading(true)
    try {
      await setupSecurity(setupPin, securityPassword)
      setSuccess('Security PIN set successfully!')
      setTimeout(() => {
        setIsLoading(false)
        onSuccess?.()
      }, 1000)
    } catch (err) {
      setError('Failed to setup security PIN. Please try again.')
      setIsLoading(false)
    }
  }

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!resetPassword) {
      setError('Please enter your recovery security password.')
      return
    }

    setIsLoading(true)
    const { settings } = useSettingsStore.getState()
    const hashedEntered = await hashString(resetPassword)

    if (hashedEntered !== settings.security_password_hash) {
      setError('Incorrect security password.')
      setIsLoading(false)
      return
    }

    setIsLoading(false)
    setResetStep(2)
  }

  const handleResetPinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (resetNewPin.length !== 6 || resetConfirmPin.length !== 6) {
      setError('PIN must be 6 digits.')
      return
    }

    if (resetNewPin !== resetConfirmPin) {
      setError('PINs do not match. Please try again.')
      setResetConfirmPin('')
      resetConfirmPinInputRef.current?.focus()
      return
    }

    setIsLoading(true)
    try {
      const success = await resetPinWithPassword(resetPassword, resetNewPin)
      if (success) {
        setSuccess('PIN reset successfully!')
        setTimeout(() => {
          setIsLoading(false)
          onSuccess?.()
        }, 1000)
      } else {
        setError('Failed to reset PIN.')
        setIsLoading(false)
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
      setIsLoading(false)
    }
  }

  // Dialpad click helper for custom inputs
  const handleDialpadClick = (num: string) => {
    if (mode === 'lock') {
      if (pin.length < 6) setPin(prev => prev + num)
    } else if (mode === 'setup') {
      if (setupStep === 1) {
        if (setupPin.length < 6) setSetupPin(prev => prev + num)
      } else if (setupStep === 2) {
        if (setupConfirmPin.length < 6) setSetupConfirmPin(prev => prev + num)
      }
    } else if (mode === 'reset' && resetStep === 2) {
      if (resetNewPin.length < 6) {
        setResetNewPin(prev => prev + num)
      } else if (resetConfirmPin.length < 6) {
        setResetConfirmPin(prev => prev + num)
      }
    }
  }

  const handleDialpadBackspace = () => {
    if (mode === 'lock') {
      setPin(prev => prev.slice(0, -1))
    } else if (mode === 'setup') {
      if (setupStep === 1) setSetupPin(prev => prev.slice(0, -1))
      else if (setupStep === 2) setSetupConfirmPin(prev => prev.slice(0, -1))
    } else if (mode === 'reset' && resetStep === 2) {
      if (resetConfirmPin.length > 0) {
        setResetConfirmPin(prev => prev.slice(0, -1))
      } else {
        setResetNewPin(prev => prev.slice(0, -1))
      }
    }
  }

  const handleDialpadClear = () => {
    if (mode === 'lock') {
      setPin('')
    } else if (mode === 'setup') {
      if (setupStep === 1) setSetupPin('')
      else if (setupStep === 2) setSetupConfirmPin('')
    } else if (mode === 'reset' && resetStep === 2) {
      setResetNewPin('')
      setResetConfirmPin('')
    }
  }

  const refocusActiveInput = () => {
    if (mode === 'lock') {
      pinInputRef.current?.focus()
    } else if (mode === 'setup') {
      if (setupStep === 1) setupPinInputRef.current?.focus()
      else if (setupStep === 2) setupConfirmPinInputRef.current?.focus()
    } else if (mode === 'reset') {
      if (resetStep === 2) resetPinInputRef.current?.focus()
    }
  }

  const overlayClass = "fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 text-zinc-50 p-4 select-none backdrop-blur-md"
  const cardClass = "w-full max-w-md p-8 rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl space-y-6 overflow-hidden flex flex-col justify-center animate-fade-in animate-duration-300"

  return (
    <div
      className={overlayClass}
      onClick={(e) => {
        const target = e.target as HTMLElement
        const isInteractive = target.closest('input:not([class*="opacity-0"]), button, select, textarea')
        if (!isInteractive) {
          refocusActiveInput()
        }
      }}
    >
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          15%, 45%, 75% { transform: translateX(-8px); }
          30%, 60%, 90% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>

      <div className={cn(cardClass, isShaking && "animate-shake")}>
        {/* ==================== 1. LOCK / UNLOCK VIEW ==================== */}
        {mode === 'lock' && (
          <div className="space-y-6 flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <Lock className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-xl font-bold tracking-tight text-white">Enter Security PIN</h2>
              <p className="text-sm text-zinc-400">Workspace is locked. Input your 6-digit PIN.</p>
            </div>

            {/* Glowing PIN Dots */}
            <div 
              className="relative w-full py-4 cursor-pointer"
              onClick={() => pinInputRef.current?.focus()}
            >
              <input
                ref={pinInputRef}
                type="text"
                pattern="[0-9]*"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={e => {
                  setError(null)
                  setPin(e.target.value.replace(/[^0-9]/g, ''))
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-default"
                disabled={isLoading}
              />
              <div className="flex gap-4 justify-center">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "w-4 h-4 rounded-full border-2 transition-all duration-200",
                      i < pin.length 
                        ? "bg-primary border-primary scale-110 shadow-[0_0_8px_rgba(99,102,241,0.6)]" 
                        : "border-zinc-700 bg-zinc-950"
                    )}
                  />
                ))}
              </div>
            </div>

            {error && (
              <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5 animate-scale-in">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Dialpad UI */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] pt-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handleDialpadClick(num)}
                  className="w-16 h-16 rounded-full border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-700 active:scale-95 transition-all text-xl font-semibold flex items-center justify-center mx-auto cursor-pointer"
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                onClick={handleDialpadClear}
                className="w-16 h-16 rounded-full hover:bg-zinc-800/40 text-sm font-medium flex items-center justify-center mx-auto text-zinc-400 cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => handleDialpadClick('0')}
                className="w-16 h-16 rounded-full border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-700 active:scale-95 transition-all text-xl font-semibold flex items-center justify-center mx-auto cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleDialpadBackspace}
                className="w-16 h-16 rounded-full hover:bg-zinc-800/40 text-sm font-medium flex items-center justify-center mx-auto text-zinc-400 cursor-pointer"
              >
                Delete
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setMode('reset')
                setResetStep(1)
                setResetPassword('')
                setResetNewPin('')
                setResetConfirmPin('')
                setError(null)
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium pt-2 transition-colors cursor-pointer"
            >
              Forgot PIN? Reset with Security Password
            </button>
          </div>
        )}

        {/* ==================== 2. SETUP SECURITY VIEW ==================== */}
        {mode === 'setup' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Secure Your Workspace</h2>
                <p className="text-xs text-zinc-400">Step {setupStep} of 3</p>
              </div>
            </div>

            {setupStep === 1 && (
              <div className="space-y-5 text-center flex flex-col items-center">
                <p className="text-sm text-zinc-300">Choose a secure 6-digit PIN</p>
                <div 
                  className="relative w-full py-2 cursor-pointer"
                  onClick={() => setupPinInputRef.current?.focus()}
                >
                  <input
                    ref={setupPinInputRef}
                    type="text"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={6}
                    value={setupPin}
                    onChange={e => {
                      setError(null)
                      setSetupPin(e.target.value.replace(/[^0-9]/g, ''))
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-default"
                    autoFocus
                  />
                  <div className="flex gap-3 justify-center">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition-all",
                          i === setupPin.length ? "border-indigo-500 bg-indigo-500/5 shadow-[0_0_8px_rgba(99,102,241,0.2)]" : "border-zinc-800 bg-zinc-950",
                          i < setupPin.length ? "border-indigo-500/60" : ""
                        )}
                      >
                        {i < setupPin.length ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                {error && <p className="text-xs text-rose-400">{error}</p>}

                {/* Dialpad UI */}
                <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] pt-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleDialpadClick(num)}
                      className="w-14 h-14 rounded-full border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-700 text-lg font-semibold flex items-center justify-center mx-auto cursor-pointer"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleDialpadClear}
                    className="w-14 h-14 rounded-full hover:bg-zinc-800/40 text-xs font-medium flex items-center justify-center mx-auto text-zinc-400 cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDialpadClick('0')}
                    className="w-14 h-14 rounded-full border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-700 text-lg font-semibold flex items-center justify-center mx-auto cursor-pointer"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleDialpadBackspace}
                    className="w-14 h-14 rounded-full hover:bg-zinc-800/40 text-xs font-medium flex items-center justify-center mx-auto text-zinc-400 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}

            {setupStep === 2 && (
              <div className="space-y-5 text-center flex flex-col items-center animate-fade-in">
                <p className="text-sm text-zinc-300">Confirm your 6-digit PIN</p>
                <div 
                  className="relative w-full py-2 cursor-pointer"
                  onClick={() => setupConfirmPinInputRef.current?.focus()}
                >
                  <input
                    ref={setupConfirmPinInputRef}
                    type="text"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={6}
                    value={setupConfirmPin}
                    onChange={e => {
                      setError(null)
                      setSetupConfirmPin(e.target.value.replace(/[^0-9]/g, ''))
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-default"
                    autoFocus
                  />
                  <div className="flex gap-3 justify-center">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className={cn(
                          "w-12 h-12 rounded-xl border-2 flex items-center justify-center text-xl font-bold transition-all",
                          i === setupConfirmPin.length ? "border-indigo-500 bg-indigo-500/5 shadow-[0_0_8px_rgba(99,102,241,0.2)]" : "border-zinc-800 bg-zinc-950",
                          i < setupConfirmPin.length ? "border-indigo-500/60" : ""
                        )}
                      >
                        {i < setupConfirmPin.length ? (
                          <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>

                {error && <p className="text-xs text-rose-400">{error}</p>}

                {/* Dialpad UI */}
                <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] pt-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleDialpadClick(num)}
                      className="w-14 h-14 rounded-full border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-700 text-lg font-semibold flex items-center justify-center mx-auto cursor-pointer"
                    >
                      {num}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleDialpadClear}
                    className="w-14 h-14 rounded-full hover:bg-zinc-800/40 text-xs font-medium flex items-center justify-center mx-auto text-zinc-400 cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDialpadClick('0')}
                    className="w-14 h-14 rounded-full border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-700 text-lg font-semibold flex items-center justify-center mx-auto cursor-pointer"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleDialpadBackspace}
                    className="w-14 h-14 rounded-full hover:bg-zinc-800/40 text-xs font-medium flex items-center justify-center mx-auto text-zinc-400 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSetupStep(1)
                    setSetupConfirmPin('')
                    setError(null)
                  }}
                  className="text-xs text-zinc-400 hover:text-zinc-300 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to PIN Choice
                </button>
              </div>
            )}

            {setupStep === 3 && (
              <form onSubmit={handleSetupSubmit} className="space-y-4 animate-fade-in">
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                  <p className="text-xs text-indigo-300 leading-relaxed">
                    Set a master recovery password. If you ever forget your 6-digit PIN, this security password will allow you to bypass the lock and configure a new one. Store it safely!
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Security Password *</label>
                    <div className="relative">
                      <input
                        type={showPasswords ? "text" : "password"}
                        value={securityPassword}
                        onChange={e => setSecurityPassword(e.target.value)}
                        placeholder="Min. 8 characters"
                        required
                        className="w-full px-3.5 py-2 border border-zinc-800 bg-zinc-950 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 pr-10 text-white"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(!showPasswords)}
                        className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                      >
                        {showPasswords ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Confirm Security Password *</label>
                    <input
                      type={showPasswords ? "text" : "password"}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repeat recovery password"
                      required
                      className="w-full px-3.5 py-2 border border-zinc-800 bg-zinc-950 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-white"
                    />
                  </div>
                </div>

                {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">{error}</p>}
                {success && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">{success}</p>}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSetupStep(2)
                      setSetupConfirmPin('')
                      setError(null)
                    }}
                    className="flex-1 px-4 py-2 border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 text-sm font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {isLoading ? 'Saving...' : 'Save & Unlock'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* ==================== 3. RESET PIN VIEW (PASSWORD RECOVERY) ==================== */}
        {mode === 'reset' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Reset Security PIN</h2>
                <p className="text-xs text-zinc-400">Recover your locked workspace</p>
              </div>
            </div>

            {resetStep === 1 && (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                <p className="text-xs text-zinc-400 leading-relaxed">
                  To set a new PIN, please verify your master recovery security password.
                </p>

                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Recovery Security Password</label>
                  <div className="relative">
                    <input
                      type={showPasswords ? "text" : "password"}
                      value={resetPassword}
                      onChange={e => setResetPassword(e.target.value)}
                      placeholder="Enter recovery password"
                      required
                      className="w-full px-3.5 py-2 border border-zinc-800 bg-zinc-950 rounded-lg text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 pr-10 text-white"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(!showPasswords)}
                      className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300 cursor-pointer"
                    >
                      {showPasswords ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                  </div>
                </div>

                {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">{error}</p>}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('lock')
                      setPin('')
                      setError(null)
                    }}
                    className="flex-1 px-4 py-2 border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 text-sm font-medium rounded-lg transition-colors cursor-pointer"
                  >
                    Back to Lock
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow-md transition-colors cursor-pointer"
                  >
                    Verify
                  </button>
                </div>
              </form>
            )}

            {resetStep === 2 && (
              <form onSubmit={handleResetPinSubmit} className="space-y-5">
                <div className="space-y-4">
                  <p className="text-xs text-zinc-400">Security password verified. Please enter a new 6-digit PIN.</p>
                  
                  <div className="space-y-3">
                    <div 
                      className="relative w-full py-1 cursor-pointer"
                      onClick={() => resetPinInputRef.current?.focus()}
                    >
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">New 6-Digit PIN</label>
                      <input
                        ref={resetPinInputRef}
                        type="text"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        maxLength={6}
                        value={resetNewPin}
                        onChange={e => {
                          setError(null)
                          setResetNewPin(e.target.value.replace(/[^0-9]/g, ''))
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-default"
                        autoFocus
                      />
                      <div className="flex gap-3 justify-center">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "w-10 h-10 rounded-xl border-2 flex items-center justify-center text-lg font-bold transition-all",
                              i === resetNewPin.length ? "border-indigo-500 bg-indigo-500/5 shadow-[0_0_8px_rgba(99,102,241,0.2)]" : "border-zinc-800 bg-zinc-950",
                              i < resetNewPin.length ? "border-indigo-500/60" : ""
                            )}
                          >
                            {i < resetNewPin.length ? (
                              <span className="w-2 h-2 rounded-full bg-indigo-500" />
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div 
                      className="relative w-full py-1 cursor-pointer"
                      onClick={() => resetConfirmPinInputRef.current?.focus()}
                    >
                      <label className="block text-xs font-medium text-zinc-400 mb-1.5">Confirm New PIN</label>
                      <input
                        ref={resetConfirmPinInputRef}
                        type="text"
                        pattern="[0-9]*"
                        inputMode="numeric"
                        maxLength={6}
                        value={resetConfirmPin}
                        onChange={e => {
                          setError(null)
                          setResetConfirmPin(e.target.value.replace(/[^0-9]/g, ''))
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-default"
                      />
                      <div className="flex gap-3 justify-center">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div
                            key={i}
                            className={cn(
                              "w-10 h-10 rounded-xl border-2 flex items-center justify-center text-lg font-bold transition-all",
                              i === resetConfirmPin.length ? "border-indigo-500 bg-indigo-500/5 shadow-[0_0_8px_rgba(99,102,241,0.2)]" : "border-zinc-800 bg-zinc-950",
                              i < resetConfirmPin.length ? "border-indigo-500/60" : ""
                            )}
                          >
                            {i < resetConfirmPin.length ? (
                              <span className="w-2 h-2 rounded-full bg-indigo-500" />
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg">{error}</p>}
                {success && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">{success}</p>}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setResetStep(1)
                      setResetNewPin('')
                      setResetConfirmPin('')
                      setError(null)
                    }}
                    className="flex-1 px-4 py-2 border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 text-sm font-medium rounded-lg transition-colors cursor-pointer animate-fade-in"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading || resetNewPin.length !== 6 || resetConfirmPin.length !== 6}
                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg shadow-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Saving...' : 'Reset & Unlock'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
