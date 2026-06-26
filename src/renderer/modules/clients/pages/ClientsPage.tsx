import { useEffect, useState, useMemo } from 'react'
import { useClientStore, type Client } from '@/stores/useClientStore'
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
  Filter,
  AlertCircle
} from 'lucide-react'

export function ClientsPage() {
  const { clients, loading, error, fetchClients, createClient, updateClient, deleteClient } = useClientStore()

  // State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  // Form Field State
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [status, setStatus] = useState('active')

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  // Filter & Search
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())

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
    setFormError(null)
  }

  const handleOpenCreate = () => {
    setEditingClientId(null)
    resetForm()
    setShowCreateModal(true)
  }

  const handleOpenEdit = (client: Client) => {
    setEditingClientId(client.id)
    setName(client.name)
    setCompany(client.company)
    setEmail(client.email)
    setPhone(client.phone)
    setStatus(client.status)
    setFormError(null)
    setShowCreateModal(true)
    setOpenMenuId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setFormError('Client name is required')
      return
    }

    try {
      const payload = { name, company, email, phone, status }
      if (editingClientId) {
        await updateClient(editingClientId, payload)
      } else {
        await createClient(payload)
      }
      setShowCreateModal(false)
      resetForm()
    } catch (err) {
      setFormError((err as Error).message)
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
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {clients.length} client{clients.length !== 1 ? 's' : ''} registered
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex items-center flex-1 gap-2 px-3 py-2 rounded-lg border bg-card focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all duration-200">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search clients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3 py-2 rounded-lg border bg-card text-sm outline-none cursor-pointer"
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
        <div className="border rounded-xl bg-card">
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
        <div className="border rounded-xl bg-card overflow-hidden">
          <div className="overflow-x-auto min-h-[calc(100vh-300px)] pb-20">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase select-none">
                  <th className="px-6 py-4">Client Name & Company</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Projects</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-sm">
                {filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-muted/10 group">
                    {/* Name / Company */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-foreground">{client.name}</div>
                      {client.company ? (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3" />
                          {client.company}
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground/40 italic">No company info</div>
                      )}
                    </td>

                    {/* Email */}
                    <td className="px-6 py-4">
                      {client.email ? (
                        <a href={`mailto:${client.email}`} className="text-primary hover:underline flex items-center gap-1.5 w-fit">
                          <Mail className="w-3.5 h-3.5" />
                          {client.email}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground/40 italic">-</span>
                      )}
                    </td>

                    {/* Phone */}
                    <td className="px-6 py-4">
                      {client.phone ? (
                        <a href={`tel:${client.phone}`} className="text-foreground hover:underline flex items-center gap-1.5 w-fit">
                          <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                          {client.phone}
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground/40 italic">-</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4 text-center select-none">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${client.status === 'active'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400'
                          }`}
                      >
                        {client.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    {/* Associated Projects Count */}
                    <td className="px-6 py-4 text-center font-medium text-foreground">
                      {client._count?.projects || 0}
                    </td>

                    {/* Action buttons */}
                    <td className={`px-6 py-4 text-right relative ${openMenuId === client.id ? 'z-30' : ''}`}>
                      <button
                        onClick={() =>
                          setOpenMenuId(openMenuId === client.id ? null : client.id)
                        }
                        className={`
    p-1 rounded-md
    text-muted-foreground
    hover:bg-muted
    hover:text-foreground
    transition-colors
    cursor-pointer
    opacity-100
  `}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openMenuId === client.id && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                          <div
                            className="absolute right-0 top-full mt-2 w-32
             bg-card rounded-lg border shadow-xl
             z-[9999] py-1 animate-scale-in"
                          >
                            <button
                              onClick={() => handleOpenEdit(client)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-muted transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" /> Edit Profile
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowCreateModal(false)} />
          <div className="relative w-full max-w-md mx-4 bg-card rounded-xl border shadow-2xl p-6 animate-scale-in">
            <div className="flex items-center justify-between mb-4 border-b pb-3">
              <h2 className="text-lg font-bold text-foreground">
                {editingClientId ? 'Edit Client Profile' : 'Register New Client'}
              </h2>
              <button onClick={() => setShowCreateModal(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Client / Contact Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="e.g. John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Company / Agency Name</label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="e.g. Acme Corporation"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="e.g. client@domain.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  placeholder="e.g. +1 (123) 456-7890"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">Account Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary cursor-pointer"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border hover:bg-muted transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
                >
                  {editingClientId ? 'Save Profile' : 'Register Client'}
                </button>
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
