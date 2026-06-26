import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUIStore } from '@/stores/useUIStore'
import { Breadcrumbs } from '@/components/layout'
import { StatusBadge, PriorityBadge } from '@/components/shared'
import { cn, formatDate } from '@/lib/utils'
import {
  Search,
  FolderKanban,
  CheckSquare,
  FileText,
  Users,
  ArrowLeft,
  Calendar,
  Building2,
  ExternalLink,
  ChevronRight,
  Clock,
  Mail,
  Phone
} from 'lucide-react'

// Safe highlighting component for search queries
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query || !text) return <>{text}</>
  const escapedQuery = query.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escapedQuery})`, 'gi'))
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-primary/20 dark:bg-primary/40 text-primary-foreground dark:text-primary-foreground font-semibold px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

interface SearchResults {
  projects: any[]
  todos: any[]
  notes: any[]
  clients: any[]
}

type TabType = 'all' | 'projects' | 'todos' | 'notes' | 'clients'

export function SearchPage() {
  const navigate = useNavigate()
  const { globalSearch, setGlobalSearch } = useUIStore()
  const [results, setResults] = useState<SearchResults>({
    projects: [],
    todos: [],
    notes: [],
    clients: []
  })
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('all')

  // Fetch results when globalSearch changes
  useEffect(() => {
    let active = true
    const searchVal = globalSearch.trim()

    if (!searchVal) {
      setResults({ projects: [], todos: [], notes: [], clients: [] })
      return
    }

    const performSearch = async () => {
      setLoading(true)
      try {
        const searchResults = await window.api.search.global(searchVal)
        if (active) {
          setResults(searchResults)
        }
      } catch (err) {
        console.error('[Search Error]', err)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    // Debounce the search query slightly to avoid excessive SQLite hits
    const delayDebounceFn = setTimeout(() => {
      performSearch()
    }, 150)

    return () => {
      active = false
      clearTimeout(delayDebounceFn)
    }
  }, [globalSearch])

  // Count total matches
  const totalCount = useMemo(() => {
    return (
      results.projects.length +
      results.todos.length +
      results.notes.length +
      results.clients.length
    )
  }, [results])

  const tabs = [
    { id: 'all', label: 'All Results', count: totalCount },
    { id: 'projects', label: 'Projects', count: results.projects.length },
    { id: 'todos', label: 'Tasks', count: results.todos.length },
    { id: 'notes', label: 'Notes', count: results.notes.length },
    { id: 'clients', label: 'Clients', count: results.clients.length }
  ]

  const handleClear = () => {
    setGlobalSearch('')
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      {/* Header */}
      <div className="shrink-0 border-b bg-card/50 px-6 py-4">
        <div className="flex items-center gap-4 mb-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            title="Go Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <Breadcrumbs items={[{ label: 'Search Results' }]} />
            <h1 className="text-xl font-bold mt-1">Search Results</h1>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 mt-4 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                activeTab === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20 font-semibold'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              {tab.label}
              <span className={cn(
                'px-1.5 py-0.2 rounded-full text-xs font-semibold',
                activeTab === tab.id
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted-foreground/10 text-muted-foreground'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Results Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            <p className="text-sm text-muted-foreground font-medium animate-pulse">Searching the workspace database...</p>
          </div>
        ) : !globalSearch.trim() ? (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Start searching</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Type in the search bar above to query projects, tasks, note items, and clients in your workspace.
              </p>
            </div>
          </div>
        ) : totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-sm mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-muted/60 flex items-center justify-center text-muted-foreground">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">No results match "{globalSearch}"</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Double-check spelling, try search terms with other words, or broaden your filters.
              </p>
              <button
                onClick={handleClear}
                className="mt-4 text-xs font-semibold text-primary hover:underline"
              >
                Clear Search
              </button>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            {/* Project Results */}
            {(activeTab === 'all' || activeTab === 'projects') && results.projects.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <FolderKanban className="w-4 h-4 text-indigo-500" />
                  <span>Projects ({results.projects.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.projects.map((proj) => (
                    <div
                      key={proj.id}
                      onClick={() => navigate(`/projects/${proj.id}`)}
                      className="group p-5 rounded-xl border bg-card hover:bg-muted/40 hover:border-primary/40 shadow-sm transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border group-hover:bg-background">
                            <Highlight text={proj.code} query={globalSearch} />
                          </span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-0.5" />
                        </div>
                        <h4 className="text-sm font-bold text-card-foreground group-hover:text-primary transition-colors">
                          <Highlight text={proj.name} query={globalSearch} />
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
                          <Highlight text={proj.description} query={globalSearch} />
                        </p>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 items-center mt-4 pt-4 border-t border-muted">
                        <StatusBadge status={proj.status} />
                        <PriorityBadge priority={proj.priority} />
                        {proj.client && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
                            <Building2 className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[120px]">{proj.client.name}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Todo Results */}
            {(activeTab === 'all' || activeTab === 'todos') && results.todos.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <CheckSquare className="w-4 h-4 text-green-500" />
                  <span>Tasks ({results.todos.length})</span>
                </div>
                <div className="space-y-2">
                  {results.todos.map((todo) => (
                    <div
                      key={todo.id}
                      onClick={() => navigate(`/projects/${todo.projectId}?tab=todos`)}
                      className="group p-4 rounded-xl border bg-card hover:bg-muted/40 hover:border-primary/40 shadow-sm transition-all cursor-pointer flex items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-green-500/10 text-green-600 dark:text-green-400 flex items-center justify-center">
                          <CheckSquare className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-card-foreground group-hover:text-primary transition-colors truncate">
                            <Highlight text={todo.title} query={globalSearch} />
                          </h4>
                          {todo.description && (
                            <p className="text-xs text-muted-foreground truncate mt-1">
                              <Highlight text={todo.description} query={globalSearch} />
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-2">
                            <FolderKanban className="w-3 h-3" />
                            <span className="font-medium hover:underline text-card-foreground/70">{todo.project.name}</span>
                            {todo.dueDate && (
                              <>
                                <span>•</span>
                                <Calendar className="w-3 h-3" />
                                <span>Due {formatDate(todo.dueDate)}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <StatusBadge status={todo.status} />
                        <PriorityBadge priority={todo.priority} />
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Note Results */}
            {(activeTab === 'all' || activeTab === 'notes') && results.notes.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <FileText className="w-4 h-4 text-amber-500" />
                  <span>Notes ({results.notes.length})</span>
                </div>
                <div className="space-y-2">
                  {results.notes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => navigate(`/projects/${note.projectId}?tab=notes`)}
                      className="group p-4 rounded-xl border bg-card hover:bg-muted/40 hover:border-primary/40 shadow-sm transition-all cursor-pointer flex items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5 shrink-0 w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-card-foreground group-hover:text-primary transition-colors truncate">
                            <Highlight text={note.title} query={globalSearch} />
                          </h4>
                          {note.content && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-1 leading-relaxed">
                              <Highlight text={note.content.replace(/<[^>]*>/g, '')} query={globalSearch} />
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-2">
                            <FolderKanban className="w-3 h-3" />
                            <span className="font-medium text-card-foreground/70">{note.project.name}</span>
                            <span>•</span>
                            <Clock className="w-3 h-3" />
                            <span>Updated {formatDate(note.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all shrink-0 group-hover:translate-x-0.5" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Client Results */}
            {(activeTab === 'all' || activeTab === 'clients') && results.clients.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b pb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Users className="w-4 h-4 text-rose-500" />
                  <span>Clients ({results.clients.length})</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.clients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => navigate('/clients')}
                      className="group p-5 rounded-xl border bg-card hover:bg-muted/40 hover:border-primary/40 shadow-sm transition-all cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="text-sm font-bold text-card-foreground group-hover:text-primary transition-colors">
                            <Highlight text={client.name} query={globalSearch} />
                          </h4>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-0.5" />
                        </div>
                        {client.company && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground/80" />
                            <Highlight text={client.company} query={globalSearch} />
                          </p>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-1.5 mt-4 pt-4 border-t border-muted text-xs text-muted-foreground">
                        {client.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                            <span className="truncate"><Highlight text={client.email} query={globalSearch} /></span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
