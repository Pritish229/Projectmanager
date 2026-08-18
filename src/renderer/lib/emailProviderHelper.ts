export interface EmailProviderInfo {
  type: string
  name: string
  color: string // text color
  bgColor: string // bg color
  borderColor: string // border color
  dotColor: string // CSS dot class or hex
}

export function getEmailProviderInfo(host?: string, user?: string, name?: string): EmailProviderInfo {
  const h = (host || '').toLowerCase()
  const u = (user || '').toLowerCase()
  const n = (name || '').toLowerCase()

  if (h.includes('gmail') || u.includes('gmail.com') || n.includes('gmail')) {
    return {
      type: 'gmail',
      name: 'Gmail',
      color: 'text-red-400',
      bgColor: 'bg-red-500/15',
      borderColor: 'border-red-500/30',
      dotColor: 'bg-red-500'
    }
  }

  if (h.includes('yahoo') || u.includes('yahoo.com') || n.includes('yahoo')) {
    return {
      type: 'yahoo',
      name: 'Yahoo Mail',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/15',
      borderColor: 'border-purple-500/30',
      dotColor: 'bg-purple-500'
    }
  }

  if (
    h.includes('office365') ||
    h.includes('outlook') ||
    u.includes('outlook.com') ||
    u.includes('hotmail.com') ||
    n.includes('outlook')
  ) {
    return {
      type: 'outlook',
      name: 'Outlook',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/15',
      borderColor: 'border-blue-500/30',
      dotColor: 'bg-blue-500'
    }
  }

  if (h.includes('icloud') || u.includes('icloud.com') || u.includes('me.com')) {
    return {
      type: 'icloud',
      name: 'iCloud',
      color: 'text-sky-400',
      bgColor: 'bg-sky-500/15',
      borderColor: 'border-sky-500/30',
      dotColor: 'bg-sky-400'
    }
  }

  if (h.includes('mailtrap')) {
    return {
      type: 'mailtrap',
      name: 'Mailtrap',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/15',
      borderColor: 'border-emerald-500/30',
      dotColor: 'bg-emerald-400'
    }
  }

  if (h.includes('sendgrid')) {
    return {
      type: 'sendgrid',
      name: 'SendGrid',
      color: 'text-indigo-400',
      bgColor: 'bg-indigo-500/15',
      borderColor: 'border-indigo-500/30',
      dotColor: 'bg-indigo-400'
    }
  }

  return {
    type: 'custom',
    name: 'Custom SMTP',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/15',
    borderColor: 'border-amber-500/30',
    dotColor: 'bg-amber-400'
  }
}
