import { useEffect, useState, useMemo } from 'react'
import { useClientStore, type Client, type ClientAddress, type ClientContact } from '@/stores/useClientStore'
import { Breadcrumbs } from '@/components/layout'
import { EmptyState, ConfirmDialog } from '@/components/shared'
import {
  Plus,
  Search,
  Users,
  MoreVertical,
  Pencil,
  Trash2,
  X,
  Mail,
  Phone,
  Building2,
  MapPin,
  Globe,
  FileText,
  CreditCard,
  Eye,
  AlertCircle,
  Check,
  UserCheck,
  Briefcase
} from 'lucide-react'

function parseJsonArray<T>(val: any): T[] {
  if (!val) return []
  if (Array.isArray(val)) return val
  try {
    const parsed = JSON.parse(val)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function ClientsPage() {
  const { clients, loading, fetchClients, createClient, updateClient, deleteClient } = useClientStore()

  // State
  const [showModal, setShowModal] = useState(false)
  const [activeModalTab, setActiveModalTab] = useState<'general' | 'addresses' | 'contacts' | 'tax_notes'>('general')
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [viewingClient, setViewingClient] = useState<Client | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form Field State
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState('active')
  const [gstNo, setGstNo] = useState('')
  const [panNo, setPanNo] = useState('')
  const [website, setWebsite] = useState('')
  const [currency, setCurrency] = useState('')
  const [notes, setNotes] = useState('')
  const [addresses, setAddresses] = useState<ClientAddress[]>([])
  const [contacts, setContacts] = useState<ClientContact[]>([])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  // Filter & Search
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const q = searchTerm.toLowerCase()
      const matchesSearch =
        c.name.toLowerCase().includes(q) ||
        (c.company || '').toLowerCase().includes(q) ||
        (c.email || '').toLowerCase().includes(q) ||
        (c.gstNo || '').toLowerCase().includes(q)

      const matchesStatus = statusFilter === 'all' ? true : c.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [clients, searchTerm, statusFilter])

  const resetForm = () => {
    setName('')
    setCompany('')
    setEmail('')
    setPhone('')
    setStatus('active')
    setGstNo('')
    setPanNo('')
    setWebsite('')
    setCurrency('')
    setNotes('')
    setAddresses([])
    setContacts([])
    setFormError(null)
    setActiveModalTab('general')
  }

  const handleOpenCreate = () => {
    setEditingClientId(null)
    resetForm()
    setShowModal(true)
  }

  const handleOpenEdit = (client: Client) => {
    setEditingClientId(client.id)
    setName(client.name || '')
    setCompany(client.company || '')
    setEmail(client.email || '')
    setPhone(client.phone || '')
    setStatus(client.status || 'active')
    setGstNo(client.gstNo || '')
    setPanNo(client.panNo || '')
    setWebsite(client.website || '')
    setCurrency(client.currency || '')
    setNotes(client.notes || '')
    setAddresses(parseJsonArray<ClientAddress>(client.addresses))
    setContacts(parseJsonArray<ClientContact>(client.contacts))
    setFormError(null)
    setActiveModalTab('general')
    setShowModal(true)
    setOpenMenuId(null)
  }

  // Address helpers
  const handleAddAddress = () => {
    const newAddr: ClientAddress = {
      id: `addr_${Date.now()}`,
      label: addresses.length === 0 ? 'Headquarters' : 'Billing Address',
      street: '',
      city: '',
      state: '',
      pincode: '',
      country: '',
      isPrimary: addresses.length === 0
    }
    setAddresses([...addresses, newAddr])
  }

  const handleUpdateAddress = (id: string, field: keyof ClientAddress, value: any) => {
    setAddresses(prev => prev.map(a => {
      if (a.id !== id) {
        if (field === 'isPrimary' && value === true) {
          return { ...a, isPrimary: false }
        }
        return a
      }
      return { ...a, [field]: value }
    }))
  }

  const handleRemoveAddress = (id: string) => {
    setAddresses(prev => prev.filter(a => a.id !== id))
  }

  // Contact helpers
  const handleAddContact = () => {
    const newContact: ClientContact = {
      id: `ct_${Date.now()}`,
      name: '',
      role: '',
      email: '',
      phone: '',
      isPrimary: contacts.length === 0
    }
    setContacts([...contacts, newContact])
  }

  const handleUpdateContact = (id: string, field: keyof ClientContact, value: any) => {
    setContacts(prev => prev.map(c => {
      if (c.id !== id) {
        if (field === 'isPrimary' && value === true) {
          return { ...c, isPrimary: false }
        }
        return c
      }
      return { ...c, [field]: value }
    }))
  }

  const handleRemoveContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setFormError('Client name is required')
      setActiveModalTab('general')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        name: name.trim(),
        company: company.trim(),
        email: email.trim(),
        phone: phone.trim(),
        status,
        gstNo: gstNo.trim(),
        panNo: panNo.trim(),
        website: website.trim(),
        currency: currency.trim(),
        notes: notes.trim(),
        addresses: JSON.stringify(addresses),
        contacts: JSON.stringify(contacts)
      }

      if (editingClientId) {
        await updateClient(editingClientId, payload)
      } else {
        await createClient(payload)
      }
      setShowModal(false)
      resetForm()
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirmId) return
    try {
      await deleteClient(deleteConfirmId)
      setDeleteConfirmId(null)
    } catch (err) {
      alert((err as Error).message)
      setDeleteConfirmId(null)
    }
  }

  return (
    <div className="p-6 h-full overflow-auto">
      <Breadcrumbs items={[{ label: 'Clients' }]} />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {clients.length} client{clients.length !== 1 ? 's' : ''} registered with full company, tax & contact records
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:bg-primary/95 transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center flex-1 gap-2 px-3 py-2 rounded-lg border bg-card focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all duration-200 shadow-xs">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by client name, company, email, or GST no..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 rounded-lg border bg-card text-sm text-foreground outline-none cursor-pointer shadow-xs"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="inactive">Inactive Only</option>
        </select>
      </div>

      {/* Main Table / List */}
      {loading && clients.length === 0 ? (
        <div className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="border rounded-xl bg-card shadow-xs">
          <EmptyState
            icon={Users}
            title="No clients found"
            description="Create client records to associate them with your workspaces and track their details."
            action={
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer"
              >
                Add Client
              </button>
            }
          />
        </div>
      ) : (
        <div className="border rounded-xl bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto min-h-[calc(100vh-300px)] pb-20">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase select-none">
                  <th className="px-6 py-4">Client & Company</th>
                  <th className="px-6 py-4">Contact & Extra</th>
                  <th className="px-6 py-4">Tax / GST</th>
                  <th className="px-6 py-4">Addresses</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Projects</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filteredClients.map((client) => {
                  const clientAddresses = parseJsonArray<ClientAddress>(client.addresses)
                  const clientContacts = parseJsonArray<ClientContact>(client.contacts)
                  const primaryAddr = clientAddresses.find(a => a.isPrimary) || clientAddresses[0]

                  return (
                    <tr key={client.id} className="hover:bg-muted/15 group transition-colors">
                      {/* Name / Company */}
                      <td className="px-6 py-4">
                        <div
                          onClick={() => setViewingClient(client)}
                          className="font-semibold text-foreground hover:text-primary transition-colors cursor-pointer flex items-center gap-2"
                        >
                          {client.name}
                        </div>
                        {client.company ? (
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <Building2 className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                            <span className="font-medium text-foreground/80">{client.company}</span>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground/50 italic mt-0.5">Individual Client</div>
                        )}
                      </td>

                      {/* Contact & Extra */}
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {client.email && (
                            <a href={`mailto:${client.email}`} className="text-xs text-primary hover:underline flex items-center gap-1.5 w-fit">
                              <Mail className="w-3 h-3 shrink-0" />
                              <span className="truncate max-w-[180px]">{client.email}</span>
                            </a>
                          )}
                          {client.phone && (
                            <a href={`tel:${client.phone}`} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 w-fit">
                              <Phone className="w-3 h-3 shrink-0" />
                              <span>{client.phone}</span>
                            </a>
                          )}
                          {clientContacts.length > 0 && (
                            <div className="flex items-center gap-1 pt-0.5">
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                <Users className="w-3 h-3" />
                                {clientContacts.length} contact{clientContacts.length > 1 ? 's' : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Tax / GST */}
                      <td className="px-6 py-4">
                        {client.gstNo ? (
                          <div className="inline-flex flex-col gap-0.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-mono text-[11px] font-semibold border border-blue-500/20">
                              GST: {client.gstNo}
                            </span>
                            {client.panNo && (
                              <span className="text-[10px] text-muted-foreground font-mono">PAN: {client.panNo}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/40 italic">Not provided</span>
                        )}
                      </td>

                      {/* Addresses */}
                      <td className="px-6 py-4">
                        {primaryAddr ? (
                          <div className="text-xs text-muted-foreground flex items-start gap-1 max-w-[200px]">
                            <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                            <div className="truncate">
                              <span className="font-semibold text-foreground">{primaryAddr.label}: </span>
                              {[primaryAddr.city, primaryAddr.state, primaryAddr.country].filter(Boolean).join(', ')}
                              {clientAddresses.length > 1 && (
                                <span className="text-[10px] text-primary ml-1 font-medium">(+{clientAddresses.length - 1} more)</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground/40 italic">No address</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="px-6 py-4 text-center select-none">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${client.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                            : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20'
                            }`}
                        >
                          {client.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Associated Projects Count */}
                      <td className="px-6 py-4 text-center font-medium text-foreground">
                        <div className="inline-flex items-center gap-1.5 justify-center">
                          <span
                            className="inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs bg-muted font-mono"
                            title={`${client._count?.projects || 0} primary project(s)`}
                          >
                            {client._count?.projects || 0}
                          </span>
                          {client._count?.collaborations ? (
                            <span
                              className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-semibold border border-indigo-500/20"
                              title={`${client._count.collaborations} collaboration project(s)`}
                            >
                              +{client._count.collaborations} collab
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Action buttons */}
                      <td className={`px-6 py-4 text-right relative ${openMenuId === client.id ? 'z-30' : ''}`}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setViewingClient(client)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                            title="View Full Profile"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(client)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-primary transition-colors cursor-pointer"
                            title="Edit Client"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() =>
                              setOpenMenuId(openMenuId === client.id ? null : client.id)
                            }
                            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>

                        {openMenuId === client.id && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute right-6 top-full mt-1 w-36 bg-card rounded-xl border shadow-xl z-50 py-1 animate-scale-in text-left">
                              <button
                                onClick={() => {
                                  setViewingClient(client)
                                  setOpenMenuId(null)
                                }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-muted-foreground" /> View Details
                              </button>
                              <button
                                onClick={() => handleOpenEdit(client)}
                                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-foreground hover:bg-muted transition-colors cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5 text-muted-foreground" /> Edit Profile
                              </button>
                              <button
                                onClick={() => {
                                  setDeleteConfirmId(client.id)
                                  setOpenMenuId(null)
                                }}
                                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Client Profile View Modal ────────────────────────────────────────── */}
      {viewingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setViewingClient(null)} />
          <div className="relative w-full max-w-2xl bg-card rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in">
            {/* Header */}
            <div className="p-6 border-b bg-muted/20 flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-lg font-bold shrink-0">
                  {viewingClient.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h2 className="text-xl font-bold text-foreground">{viewingClient.name}</h2>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${viewingClient.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                        : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20'
                        }`}
                    >
                      {viewingClient.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {viewingClient.company && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1.5 mt-1">
                      <Building2 className="w-4 h-4 text-primary" />
                      <span className="font-semibold text-foreground/90">{viewingClient.company}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const c = viewingClient
                    setViewingClient(null)
                    handleOpenEdit(c)
                  }}
                  className="px-3 py-1.5 rounded-lg border text-xs font-semibold hover:bg-muted flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => setViewingClient(null)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Quick Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Primary Contact</h4>
                  <div className="text-sm space-y-1">
                    {viewingClient.email ? (
                      <div className="flex items-center gap-2 text-foreground">
                        <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                        <a href={`mailto:${viewingClient.email}`} className="hover:underline">{viewingClient.email}</a>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">No primary email</span>
                    )}
                    {viewingClient.phone && (
                      <div className="flex items-center gap-2 text-foreground">
                        <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                        <a href={`tel:${viewingClient.phone}`} className="hover:underline">{viewingClient.phone}</a>
                      </div>
                    )}
                    {viewingClient.website && (
                      <div className="flex items-center gap-2 text-foreground">
                        <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
                        <a href={viewingClient.website.startsWith('http') ? viewingClient.website : `https://${viewingClient.website}`} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">
                          {viewingClient.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tax & Finance Details</h4>
                  <div className="text-sm space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">GST Number:</span>
                      <span className="font-mono font-semibold text-foreground">{viewingClient.gstNo || 'Not specified'}</span>
                    </div>
                    {viewingClient.panNo && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">PAN / Tax ID:</span>
                        <span className="font-mono font-semibold text-foreground">{viewingClient.panNo}</span>
                      </div>
                    )}
                    {viewingClient.currency && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Default Currency:</span>
                        <span className="font-semibold text-foreground">{viewingClient.currency}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Primary Projects:</span>
                      <span className="font-bold text-primary">{viewingClient._count?.projects || 0}</span>
                    </div>
                    {viewingClient._count?.collaborations ? (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Collaborating Projects:</span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {viewingClient._count.collaborations}
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Project Collaborations List */}
              {viewingClient.collaborations && viewingClient.collaborations.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-500" />
                    Project Collaborations ({viewingClient.collaborations.length})
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {viewingClient.collaborations.map(collab => (
                      <div key={collab.id} className="p-3 rounded-xl border bg-card flex items-center justify-between gap-2 shadow-xs">
                        <div>
                          <div className="font-semibold text-xs text-foreground">{collab.project.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{collab.project.code}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                          {collab.role}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Multiple Contacts */}
              {(() => {
                const cts = parseJsonArray<ClientContact>(viewingClient.contacts)
                if (cts.length === 0) return null
                return (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      Client Team & Secondary Contacts ({cts.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {cts.map((c) => (
                        <div key={c.id} className="p-3 rounded-xl border bg-card space-y-1 relative">
                          {c.isPrimary && (
                            <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                              Primary
                            </span>
                          )}
                          <div className="font-semibold text-foreground text-sm">{c.name}</div>
                          {c.role && <div className="text-xs text-muted-foreground font-medium">{c.role}</div>}
                          <div className="pt-1 space-y-0.5 text-xs text-muted-foreground">
                            {c.email && (
                              <div className="flex items-center gap-1.5">
                                <Mail className="w-3 h-3 text-primary/70 shrink-0" />
                                <span className="truncate">{c.email}</span>
                              </div>
                            )}
                            {c.phone && (
                              <div className="flex items-center gap-1.5">
                                <Phone className="w-3 h-3 text-primary/70 shrink-0" />
                                <span>{c.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Multiple Addresses */}
              {(() => {
                const addrs = parseJsonArray<ClientAddress>(viewingClient.addresses)
                if (addrs.length === 0) return null
                return (
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-amber-500" />
                      Registered Addresses & Locations ({addrs.length})
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {addrs.map((a) => (
                        <div key={a.id} className="p-3 rounded-xl border bg-card space-y-1 relative">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground">{a.label}</span>
                            {a.isPrimary && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                Primary Address
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground leading-relaxed pt-1">
                            {a.street && <div>{a.street}</div>}
                            <div>
                              {[a.city, a.state, a.pincode].filter(Boolean).join(', ')}
                            </div>
                            {a.country && <div className="font-medium text-foreground">{a.country}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Notes */}
              {viewingClient.notes && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Internal Remarks & Notes
                  </h4>
                  <div className="p-3.5 rounded-xl border bg-muted/20 text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                    {viewingClient.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t bg-muted/20 flex justify-end">
              <button
                onClick={() => setViewingClient(null)}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/95 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Create / Edit Comprehensive Modal ──────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-3xl bg-card rounded-2xl border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-scale-in">
            {/* Modal Header */}
            <div className="p-5 border-b bg-muted/20 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground">
                  {editingClientId ? 'Edit Client Profile' : 'Register New Client'}
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Configure company details, multiple locations, team contacts, and GST / tax info.
                </p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Segmented Navigation Tabs */}
            <div className="flex border-b bg-muted/10 px-5 gap-2 overflow-x-auto select-none">
              <button
                type="button"
                onClick={() => setActiveModalTab('general')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer shrink-0 ${activeModalTab === 'general'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
              >
                1. General & Company
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('addresses')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${activeModalTab === 'addresses'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                2. Multiple Addresses ({addresses.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('contacts')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${activeModalTab === 'contacts'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
              >
                <Users className="w-3.5 h-3.5" />
                3. Multiple Contacts ({contacts.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveModalTab('tax_notes')}
                className={`py-3 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${activeModalTab === 'tax_notes'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
                  }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                4. Tax (GST) & Notes
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
                {formError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* TAB 1: GENERAL & COMPANY */}
                {activeModalTab === 'general' && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                          Client / Key Representative Name <span className="text-destructive">*</span>
                        </label>
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                          placeholder="e.g. John Doe or Chirag Parmer"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                          Company / Organization Name
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={company}
                            onChange={(e) => setCompany(e.target.value)}
                            className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            placeholder="e.g. BALLZ Media Pvt Ltd"
                          />
                          <Building2 className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                          Primary Email Address
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            placeholder="e.g. contact@ballzmedia.com"
                          />
                          <Mail className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                          Primary Phone Number
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            placeholder="e.g. +91 98765 43210"
                          />
                          <Phone className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                          Company Website
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            className="w-full pl-9 pr-3.5 py-2.5 rounded-lg border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                            placeholder="e.g. https://company.com"
                          />
                          <Globe className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                          Account Status
                        </label>
                        <select
                          value={status}
                          onChange={(e) => setStatus(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-lg border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer transition-all"
                        >
                          <option value="active">Active Client</option>
                          <option value="inactive">Inactive / Archived</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: MULTIPLE ADDRESSES */}
                {activeModalTab === 'addresses' && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Addresses & Locations</h3>
                        <p className="text-xs text-muted-foreground">Add multiple addresses such as Registered Office, Billing, Branch, or Warehouses.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddAddress}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Address
                      </button>
                    </div>

                    {addresses.length === 0 ? (
                      <div className="text-center py-10 border border-dashed rounded-xl bg-muted/10 text-muted-foreground text-xs">
                        No addresses added yet. Click &quot;Add Address&quot; to specify billing or branch locations.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {addresses.map((addr, idx) => (
                          <div key={addr.id} className="p-4 rounded-xl border bg-card/60 space-y-3 relative shadow-xs">
                            <div className="flex items-center justify-between gap-2 border-b pb-2.5">
                              <div className="flex items-center gap-2">
                                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                                  {idx + 1}
                                </span>
                                <input
                                  type="text"
                                  value={addr.label}
                                  onChange={(e) => handleUpdateAddress(addr.id, 'label', e.target.value)}
                                  placeholder="Address Label (e.g. Head Office, Billing)"
                                  className="text-xs font-bold text-foreground bg-transparent border-b border-dashed border-border outline-none focus:border-primary px-1"
                                />
                              </div>

                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={!!addr.isPrimary}
                                    onChange={(e) => handleUpdateAddress(addr.id, 'isPrimary', e.target.checked)}
                                    className="rounded border text-primary"
                                  />
                                  <span>Primary Address</span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveAddress(addr.id)}
                                  className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors cursor-pointer"
                                  title="Remove Address"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Street Address</label>
                                <input
                                  type="text"
                                  value={addr.street || ''}
                                  onChange={(e) => handleUpdateAddress(addr.id, 'street', e.target.value)}
                                  placeholder="Flat / Suite / Building / Street address"
                                  className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs outline-none focus:border-primary"
                                />
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                                <div>
                                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">City</label>
                                  <input
                                    type="text"
                                    value={addr.city || ''}
                                    onChange={(e) => handleUpdateAddress(addr.id, 'city', e.target.value)}
                                    placeholder="City"
                                    className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs outline-none focus:border-primary"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">State / Region</label>
                                  <input
                                    type="text"
                                    value={addr.state || ''}
                                    onChange={(e) => handleUpdateAddress(addr.id, 'state', e.target.value)}
                                    placeholder="State"
                                    className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs outline-none focus:border-primary"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Postal / Pincode</label>
                                  <input
                                    type="text"
                                    value={addr.pincode || ''}
                                    onChange={(e) => handleUpdateAddress(addr.id, 'pincode', e.target.value)}
                                    placeholder="Pincode / ZIP"
                                    className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs outline-none focus:border-primary font-mono"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Country</label>
                                  <input
                                    type="text"
                                    value={addr.country || ''}
                                    onChange={(e) => handleUpdateAddress(addr.id, 'country', e.target.value)}
                                    placeholder="e.g. India"
                                    className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs outline-none focus:border-primary"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: MULTIPLE CONTACTS */}
                {activeModalTab === 'contacts' && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Client Contacts & Department Leads</h3>
                        <p className="text-xs text-muted-foreground">Add multiple people in the client company (Accounting, Design Lead, Directors, etc.)</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddContact}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Contact
                      </button>
                    </div>

                    {contacts.length === 0 ? (
                      <div className="text-center py-10 border border-dashed rounded-xl bg-muted/10 text-muted-foreground text-xs">
                        No additional contacts added yet. Click &quot;Add Contact&quot; to list team members.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {contacts.map((c, idx) => (
                          <div key={c.id} className="p-4 rounded-xl border bg-card/60 space-y-3 shadow-xs">
                            <div className="flex items-center justify-between border-b pb-2">
                              <span className="text-xs font-bold text-muted-foreground">Contact #{idx + 1}</span>
                              <div className="flex items-center gap-3">
                                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                                  <input
                                    type="checkbox"
                                    checked={!!c.isPrimary}
                                    onChange={(e) => handleUpdateContact(c.id, 'isPrimary', e.target.checked)}
                                    className="rounded border text-primary"
                                  />
                                  <span>Primary Representative</span>
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveContact(c.id)}
                                  className="p-1 text-muted-foreground hover:text-destructive rounded transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Full Name</label>
                                <input
                                  type="text"
                                  value={c.name}
                                  onChange={(e) => handleUpdateContact(c.id, 'name', e.target.value)}
                                  placeholder="e.g. Sarah Jenkins"
                                  className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs outline-none focus:border-primary"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Role / Designation</label>
                                <input
                                  type="text"
                                  value={c.role || ''}
                                  onChange={(e) => handleUpdateContact(c.id, 'role', e.target.value)}
                                  placeholder="e.g. Accounts & Billing Manager"
                                  className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs outline-none focus:border-primary"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Email</label>
                                <input
                                  type="email"
                                  value={c.email || ''}
                                  onChange={(e) => handleUpdateContact(c.id, 'email', e.target.value)}
                                  placeholder="e.g. sarah@client.com"
                                  className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs outline-none focus:border-primary"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Phone</label>
                                <input
                                  type="text"
                                  value={c.phone || ''}
                                  onChange={(e) => handleUpdateContact(c.id, 'phone', e.target.value)}
                                  placeholder="e.g. +91 91234 56789"
                                  className="w-full px-3 py-1.5 rounded-lg border bg-background text-xs outline-none focus:border-primary"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: TAX (GST) & NOTES */}
                {activeModalTab === 'tax_notes' && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                          GST Identification Number (GSTIN) <span className="text-[10px] text-muted-foreground lowercase">(optional)</span>
                        </label>
                        <input
                          type="text"
                          value={gstNo}
                          onChange={(e) => setGstNo(e.target.value.toUpperCase())}
                          className="w-full px-3.5 py-2.5 rounded-lg border bg-background text-sm text-foreground outline-none font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all uppercase placeholder:normal-case"
                          placeholder="e.g. 27AAAAA0000A1Z5"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                          PAN / Business Tax ID <span className="text-[10px] text-muted-foreground lowercase">(optional)</span>
                        </label>
                        <input
                          type="text"
                          value={panNo}
                          onChange={(e) => setPanNo(e.target.value.toUpperCase())}
                          className="w-full px-3.5 py-2.5 rounded-lg border bg-background text-sm text-foreground outline-none font-mono focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all uppercase placeholder:normal-case"
                          placeholder="e.g. AAAAA0000A"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                        Preferred Billing Currency
                      </label>
                      <input
                        type="text"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        placeholder="e.g. INR (₹), USD ($), EUR (€)"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                        Internal Notes & Instructions
                      </label>
                      <textarea
                        rows={4}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-lg border bg-background text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                        placeholder="Record any special billing terms, NDA agreements, preferred communication hours, or account context..."
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t bg-muted/20 flex items-center justify-between shrink-0">
                <div className="flex gap-2">
                  {activeModalTab !== 'general' && (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs: ('general' | 'addresses' | 'contacts' | 'tax_notes')[] = ['general', 'addresses', 'contacts', 'tax_notes']
                        const prevIdx = tabs.indexOf(activeModalTab) - 1
                        if (prevIdx >= 0) setActiveModalTab(tabs[prevIdx])
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-muted transition-colors cursor-pointer"
                    >
                      Previous
                    </button>
                  )}
                  {activeModalTab !== 'tax_notes' && (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs: ('general' | 'addresses' | 'contacts' | 'tax_notes')[] = ['general', 'addresses', 'contacts', 'tax_notes']
                        const nextIdx = tabs.indexOf(activeModalTab) + 1
                        if (nextIdx < tabs.length) setActiveModalTab(tabs[nextIdx])
                      }}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border hover:bg-muted transition-colors cursor-pointer text-primary"
                    >
                      Next Step →
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 px-6 py-2 bg-primary text-primary-foreground text-sm font-bold rounded-lg hover:bg-primary/95 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? 'Saving...' : editingClientId ? 'Save Profile' : 'Register Client'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDelete}
        title="Delete Client Profile"
        description="Are you sure you want to delete this client? This will permanently remove their record. This action cannot be undone and is only allowed if they have 0 assigned projects."
        confirmLabel="Delete Client"
        variant="danger"
      />
    </div>
  )
}
