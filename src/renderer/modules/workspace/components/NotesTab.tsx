import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Node, Extension, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { useNoteStore } from '@/stores/useNoteStore'
import { ConfirmDialog, EmptyState } from '@/components/shared'
import { cn, formatDateTime, formatDate } from '@/lib/utils'
import {
  Plus, Search, Trash2, Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Code, SquareTerminal, RefreshCw, FileText, CheckCircle2, Paperclip,
  File, Image, FileSpreadsheet, Archive, Music, Video, Folder, Calendar, Clock,
  GripVertical, Pin, LayoutGrid, LayoutList, Download, Copy, Check,
  Maximize2, Minimize2, SlidersHorizontal, BookOpen, Minus
} from 'lucide-react'

// ─── Custom TipTap Extension: Tab Key Indent / Outdent & Spaces ──────────────
const TabKeyExtension = Extension.create({
  name: 'tabKey',
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
          return editor.commands.sinkListItem('listItem')
        }
        return editor.commands.insertContent('    ')
      },
      'Shift-Tab': ({ editor }) => {
        if (editor.isActive('bulletList') || editor.isActive('orderedList')) {
          return editor.commands.liftListItem('listItem')
        }
        return false
      }
    }
  }
})

// ─── File icon helper ─────────────────────────────────────────────────────────
function getFileIcon(mimeType: string) {
  const mime = mimeType?.toLowerCase() || ''
  if (mime.startsWith('image/')) return Image
  if (mime.startsWith('video/')) return Video
  if (mime.startsWith('audio/')) return Music
  if (mime.includes('spreadsheet') || mime === 'text/csv' || mime.includes('excel')) return FileSpreadsheet
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('compressed') || mime.includes('7z')) return Archive
  return File
}

// ─── TipTap custom FileReference node ────────────────────────────────────────
function FileReferenceView({ node }: { node: any }) {
  const { fileId, fileName, mimeType } = node.attrs
  const IconComponent = getFileIcon(mimeType || '')
  const handleClick = async () => {
    try { await window.api.files.preview(fileId) } catch { /* no-op */ }
  }
  return (
    <NodeViewWrapper as="span" contentEditable={false}>
      <span
        onClick={handleClick}
        title={`Click to open ${fileName}`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs font-semibold border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors mx-0.5 select-none"
        style={{ userSelect: 'none' }}
      >
        <IconComponent className="w-3 h-3 shrink-0" />
        {fileName}
      </span>
    </NodeViewWrapper>
  )
}

const FileReferenceNode = Node.create({
  name: 'fileReference',
  group: 'inline',
  inline: true,
  atom: true,
  addAttributes() {
    return {
      fileId: {
        default: null,
        parseHTML: element => element.getAttribute('fileid') || element.getAttribute('data-file-id'),
        renderHTML: attributes => {
          if (!attributes.fileId) return {}
          return { 'fileid': attributes.fileId, 'data-file-id': attributes.fileId }
        }
      },
      fileName: {
        default: '',
        parseHTML: element => element.getAttribute('filename') || element.getAttribute('data-file-name'),
        renderHTML: attributes => {
          if (!attributes.fileName) return {}
          return { 'filename': attributes.fileName, 'data-file-name': attributes.fileName }
        }
      },
      mimeType: {
        default: '',
        parseHTML: element => element.getAttribute('mimetype') || element.getAttribute('data-mime-type'),
        renderHTML: attributes => {
          if (!attributes.mimeType) return {}
          return { 'mimetype': attributes.mimeType, 'data-mime-type': attributes.mimeType }
        }
      }
    }
  },
  parseHTML() { return [{ tag: 'span[data-file-ref]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-file-ref': true }), HTMLAttributes.filename || HTMLAttributes.fileName || '']
  },
  addNodeView() { return ReactNodeViewRenderer(FileReferenceView) }
})

// ─── TipTap custom FolderReference node ────────────────────────────────────────
function FolderReferenceView({ node }: { node: any }) {
  const { folderId, folderName } = node.attrs
  const handleClick = () => {
    sessionStorage.setItem('workspace:target-folder-id', folderId)
    window.dispatchEvent(new CustomEvent('workspace:switch-tab', { detail: { tabId: 'files' } }))
  }
  return (
    <NodeViewWrapper as="span" contentEditable={false}>
      <span
        onClick={handleClick}
        title={`Click to open folder ${folderName}`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 text-xs font-semibold border border-amber-500/20 cursor-pointer hover:bg-amber-500/20 transition-colors mx-0.5 select-none"
        style={{ userSelect: 'none' }}
      >
        <Folder className="w-3 h-3 shrink-0 text-amber-500" />
        {folderName}
      </span>
    </NodeViewWrapper>
  )
}

const FolderReferenceNode = Node.create({
  name: 'folderReference',
  group: 'inline',
  inline: true,
  atom: true,
  addAttributes() {
    return {
      folderId: {
        default: null,
        parseHTML: element => element.getAttribute('folderid') || element.getAttribute('data-folder-id'),
        renderHTML: attributes => {
          if (!attributes.folderId) return {}
          return { 'folderid': attributes.folderId, 'data-folder-id': attributes.folderId }
        }
      },
      folderName: {
        default: '',
        parseHTML: element => element.getAttribute('foldername') || element.getAttribute('data-folder-name'),
        renderHTML: attributes => {
          if (!attributes.folderName) return {}
          return { 'foldername': attributes.folderName, 'data-folder-name': attributes.folderName }
        }
      }
    }
  },
  parseHTML() { return [{ tag: 'span[data-folder-ref]' }] },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-folder-ref': true }), HTMLAttributes.foldername || HTMLAttributes.folderName || '']
  },
  addNodeView() { return ReactNodeViewRenderer(FolderReferenceView) }
})

// ─── Color Palettes ────────────────────────────────────────────────────────────
const NOTE_COLORS = [
  { id: 'slate', name: 'Slate', border: 'border-slate-300 dark:border-slate-700', bg: 'bg-slate-500/10' },
  { id: 'emerald', name: 'Emerald', border: 'border-emerald-500', bg: 'bg-emerald-500/10' },
  { id: 'sky', name: 'Sky', border: 'border-sky-500', bg: 'bg-sky-500/10' },
  { id: 'violet', name: 'Violet', border: 'border-violet-500', bg: 'bg-violet-500/10' },
  { id: 'amber', name: 'Amber', border: 'border-amber-500', bg: 'bg-amber-500/10' },
  { id: 'rose', name: 'Rose', border: 'border-rose-500', bg: 'bg-rose-500/10' },
]

// Helper for date conversion to ISO for datetime-local input
function toLocalDatetimeInput(dateStr?: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  const tzOffset = d.getTimezoneOffset() * 60000
  const localIso = new Date(d.getTime() - tzOffset).toISOString().slice(0, 16)
  return localIso
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface NotesTabProps { projectId: string; isReadOnly: boolean }
interface ProjectFile { id: string; originalName: string; mimeType: string }
interface ProjectFolder { id: string; name: string }
interface AutocompleteState { visible: boolean; query: string; x: number; y: number; selectedIndex: number }

interface NoteMeta {
  pinned?: boolean
  color?: string
  order?: number
}

// ─── Component ────────────────────────────────────────────────────────────────
export function NotesTab({ projectId, isReadOnly }: NotesTabProps) {
  const { notes, loading, fetchNotes, createNote, updateNote, updateNoteLocal, deleteNote } = useNoteStore()
  const [searchTerm, setSearchTerm] = useState('')
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [localTitle, setLocalTitle] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([])
  const [projectFolders, setProjectFolders] = useState<ProjectFolder[]>([])
  const [autocomplete, setAutocomplete] = useState<AutocompleteState>({ visible: false, query: '', x: 0, y: 0, selectedIndex: 0 })

  // Extended Features State
  const [viewMode, setViewMode] = useState<'split' | 'grid'>('split')
  const [sortOption, setSortOption] = useState<'custom' | 'created_desc' | 'created_asc' | 'updated_desc' | 'title_asc'>('custom')
  const [colorFilter, setColorFilter] = useState<string>('all')
  const [metaMap, setMetaMap] = useState<Record<string, NoteMeta>>({})
  const [editingDateModalOpen, setEditingDateModalOpen] = useState(false)
  const [tempCreatedDate, setTempCreatedDate] = useState('')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [copiedText, setCopiedText] = useState(false)
  
  // Drag and Drop state
  const [draggedNoteId, setDraggedNoteId] = useState<string | null>(null)
  const [dragOverNoteId, setDragOverNoteId] = useState<string | null>(null)

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const prevActiveNoteIdRef = useRef<string | null>(null)
  const currentContentRef = useRef<string>('')
  const currentTitleRef = useRef<string>('')
  const autocompleteRef = useRef<HTMLDivElement>(null)

  // Load persistent metadata from localStorage
  const metaStorageKey = `pwm_notes_meta_${projectId}`
  useEffect(() => {
    try {
      const saved = localStorage.getItem(metaStorageKey)
      if (saved) setMetaMap(JSON.parse(saved))
    } catch { /* no-op */ }
  }, [metaStorageKey])

  const saveMetaMap = useCallback((newMap: Record<string, NoteMeta>) => {
    setMetaMap(newMap)
    try { localStorage.setItem(metaStorageKey, JSON.stringify(newMap)) } catch { /* no-op */ }
  }, [metaStorageKey])

  useEffect(() => { fetchNotes(projectId) }, [projectId, fetchNotes])
  useEffect(() => {
    Promise.all([
      window.api.files.getByProject(projectId),
      window.api.files.getFolders(projectId)
    ]).then(([filesData, foldersData]) => {
      setProjectFiles(filesData)
      setProjectFolders(foldersData)
    }).catch(() => {})
  }, [projectId])

  useEffect(() => {
    if (notes.length > 0 && !activeNoteId) setActiveNoteId(notes[0].id)
  }, [notes, activeNoteId])

  // Merge notes with local metadata
  const enrichedNotes = useMemo(() => {
    return notes.map(n => {
      const m = metaMap[n.id] || {}
      return {
        ...n,
        pinned: m.pinned || false,
        color: m.color || 'slate',
        order: typeof m.order === 'number' ? m.order : 0
      }
    })
  }, [notes, metaMap])

  // Sort & Filter Notes
  const filteredNotes = useMemo(() => {
    let result = enrichedNotes.filter(n => {
      const matchesSearch = n.title.toLowerCase().includes(searchTerm.toLowerCase()) || n.content.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesColor = colorFilter === 'all' ? true : (colorFilter === 'pinned' ? n.pinned : n.color === colorFilter)
      return matchesSearch && matchesColor
    })

    result.sort((a, b) => {
      // Pinned notes always come first unless custom sorting or specific filters
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1

      if (sortOption === 'created_desc') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (sortOption === 'created_asc') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      if (sortOption === 'updated_desc') return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      if (sortOption === 'title_asc') return a.title.localeCompare(b.title)

      // Custom drag order sorting fallback
      return (a.order || 0) - (b.order || 0)
    })

    return result
  }, [enrichedNotes, searchTerm, colorFilter, sortOption])

  const activeNote = useMemo(() => enrichedNotes.find(n => n.id === activeNoteId) || null, [enrichedNotes, activeNoteId])

  // Autocomplete matching items
  interface AutocompleteItem { type: 'file' | 'folder'; id: string; name: string; mimeType?: string }

  const filteredMatches = useMemo((): AutocompleteItem[] => {
    const q = autocomplete.query.toLowerCase()
    
    const folderMatches = projectFolders
      .filter(f => f.name.toLowerCase().includes(q))
      .map(f => ({ type: 'folder' as const, id: f.id, name: f.name }))

    const fileMatches = projectFiles
      .filter(f => f.originalName.toLowerCase().includes(q))
      .map(f => ({ type: 'file' as const, id: f.id, name: f.originalName, mimeType: f.mimeType }))

    return [...folderMatches, ...fileMatches].slice(0, 8)
  }, [projectFiles, projectFolders, autocomplete.query])

  // Autocomplete popup close
  const closeAutocomplete = useCallback(() => {
    setAutocomplete(prev => ({ ...prev, visible: false, query: '', selectedIndex: 0 }))
  }, [])

  // TipTap Editor initialization
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start typing... Press Tab to indent, or use [ to insert file/folder references' }),
      FileReferenceNode,
      FolderReferenceNode,
      TabKeyExtension
    ],
    content: activeNote?.content || '',
    editable: !isReadOnly,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      currentContentRef.current = html
      triggerAutoSave(activeNoteId, currentTitleRef.current, html)
      // Check for [ trigger
      const { state } = editor
      const { selection } = state
      const pos = selection.$head.pos
      const textBefore = state.doc.textBetween(Math.max(0, pos - 50), pos, '\n', '\0')
      const bracketIdx = textBefore.lastIndexOf('[')
      if (bracketIdx !== -1) {
        const afterBracket = textBefore.slice(bracketIdx + 1)
        if (!afterBracket.includes(']') && !afterBracket.includes('[')) {
          const domSelection = window.getSelection()
          if (domSelection && domSelection.rangeCount > 0) {
            const range = domSelection.getRangeAt(0)
            const rect = range.getBoundingClientRect()
            setAutocomplete({ visible: true, query: afterBracket, x: rect.left, y: rect.bottom + 4, selectedIndex: 0 })
            return
          }
        }
      }
      closeAutocomplete()
    },
    onBlur: () => { setTimeout(closeAutocomplete, 150) }
  })

  const insertReference = useCallback((item: AutocompleteItem) => {
    if (!editor) return
    const { state } = editor
    const { selection } = state
    const pos = selection.$head.pos
    const textBefore = state.doc.textBetween(Math.max(0, pos - 50), pos, '\n', '\0')
    const bracketIdx = textBefore.lastIndexOf('[')
    if (bracketIdx !== -1) {
      const deleteFrom = pos - (textBefore.length - bracketIdx)
      if (item.type === 'file') {
        editor.chain().focus().deleteRange({ from: deleteFrom, to: pos }).insertContent({
          type: 'fileReference',
          attrs: { fileId: item.id, fileName: item.name, mimeType: item.mimeType || '' }
        }).run()
      } else {
        editor.chain().focus().deleteRange({ from: deleteFrom, to: pos }).insertContent({
          type: 'folderReference',
          attrs: { folderId: item.id, folderName: item.name }
        }).run()
      }
    }
    closeAutocomplete()
  }, [editor, closeAutocomplete])

  const insertRef = useRef(insertReference)
  useEffect(() => { insertRef.current = insertReference }, [insertReference])

  // Keyboard navigation for autocomplete popup
  useEffect(() => {
    if (!autocomplete.visible) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setAutocomplete(prev => ({ ...prev, selectedIndex: Math.min(prev.selectedIndex + 1, filteredMatches.length - 1) })) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setAutocomplete(prev => ({ ...prev, selectedIndex: Math.max(prev.selectedIndex - 1, 0) })) }
      else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); const item = filteredMatches[autocomplete.selectedIndex]; if (item) insertRef.current(item) }
      else if (e.key === 'Escape') { closeAutocomplete() }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.addEventListener('keydown', onKeyDown, true)
  }, [autocomplete.visible, autocomplete.selectedIndex, filteredMatches, closeAutocomplete])

  // Sync active note content into editor
  useEffect(() => {
    if (timeoutRef.current && prevActiveNoteIdRef.current) {
      clearTimeout(timeoutRef.current)
      updateNote(prevActiveNoteIdRef.current, { title: currentTitleRef.current, content: currentContentRef.current })
      setSavingStatus('saved')
    }
    if (activeNote) {
      setLocalTitle(activeNote.title || '')
      currentTitleRef.current = activeNote.title || ''
      currentContentRef.current = activeNote.content || ''
      if (editor) editor.commands.setContent(activeNote.content || '')
    } else {
      setLocalTitle('')
      currentTitleRef.current = ''
      currentContentRef.current = ''
    }
    prevActiveNoteIdRef.current = activeNoteId
  }, [activeNoteId, editor])

  useEffect(() => { if (editor) editor.setEditable(!isReadOnly) }, [isReadOnly, editor])

  // Auto-save debouncer
  const triggerAutoSave = (noteId: string | null, title: string, content: string) => {
    if (!noteId || isReadOnly) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      setSavingStatus('saving')
      try { await updateNote(noteId, { title, content }); setSavingStatus('saved'); setTimeout(() => setSavingStatus('idle'), 2000) }
      catch { setSavingStatus('idle') }
    }, 1000)
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value; setLocalTitle(val); currentTitleRef.current = val
    if (activeNoteId) { updateNoteLocal(activeNoteId, { title: val }); triggerAutoSave(activeNoteId, val, currentContentRef.current) }
  }

  const handleCreateNote = async () => {
    if (isReadOnly) return
    const newNote = await createNote({ projectId, title: 'Untitled Note', content: '' })
    const newMetaMap = { ...metaMap, [newNote.id]: { pinned: false, color: 'slate', order: -1 } }
    saveMetaMap(newMetaMap)
    setActiveNoteId(newNote.id)
  }

  const handleDeleteNote = async () => {
    if (deleteConfirmId) {
      await deleteNote(deleteConfirmId)
      if (activeNoteId === deleteConfirmId) setActiveNoteId(null)
      setDeleteConfirmId(null)
    }
  }

  // Pin / Unpin Note
  const togglePinNote = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const currentMeta = metaMap[id] || {}
    const updated = { ...metaMap, [id]: { ...currentMeta, pinned: !currentMeta.pinned } }
    saveMetaMap(updated)
  }

  // Set Note Color
  const setNoteColor = (id: string, color: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation()
    const currentMeta = metaMap[id] || {}
    const updated = { ...metaMap, [id]: { ...currentMeta, color } }
    saveMetaMap(updated)
  }

  // ─── Drag and Drop Handlers for Reordering ─────────────────────────────────
  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (isReadOnly) return
    setDraggedNoteId(id)
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    if (isReadOnly || !draggedNoteId || draggedNoteId === id) return
    e.preventDefault()
    setDragOverNoteId(id)
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (isReadOnly || !draggedNoteId || draggedNoteId === targetId) {
      setDraggedNoteId(null)
      setDragOverNoteId(null)
      return
    }

    const currentList = [...filteredNotes]
    const dragIdx = currentList.findIndex(n => n.id === draggedNoteId)
    const dropIdx = currentList.findIndex(n => n.id === targetId)

    if (dragIdx !== -1 && dropIdx !== -1) {
      const reordered = [...currentList]
      const [removed] = reordered.splice(dragIdx, 1)
      reordered.splice(dropIdx, 0, removed)

      const updatedMeta = { ...metaMap }
      reordered.forEach((noteItem, idx) => {
        updatedMeta[noteItem.id] = { ...(updatedMeta[noteItem.id] || {}), order: idx }
      })
      saveMetaMap(updatedMeta)
      setSortOption('custom')
    }

    setDraggedNoteId(null)
    setDragOverNoteId(null)
  }

  // ─── Edit Created Date Modal Handlers ─────────────────────────────────────
  const openEditDateModal = () => {
    if (!activeNote) return
    setTempCreatedDate(toLocalDatetimeInput(activeNote.createdAt))
    setEditingDateModalOpen(true)
  }

  const handleSaveCreatedDate = async () => {
    if (!activeNote || !tempCreatedDate) return
    const isoString = new Date(tempCreatedDate).toISOString()
    try {
      await updateNote(activeNote.id, { createdAt: isoString })
      updateNoteLocal(activeNote.id, { createdAt: isoString })
      setSavingStatus('saved')
      setTimeout(() => setSavingStatus('idle'), 2000)
    } catch { /* no-op */ }
    setEditingDateModalOpen(false)
  }

  const setQuickPresetDate = (preset: 'now' | '1h' | '1d' | '1w' | '1m') => {
    const d = new Date()
    if (preset === '1h') d.setHours(d.getHours() - 1)
    if (preset === '1d') d.setDate(d.getDate() - 1)
    if (preset === '1w') d.setDate(d.getDate() - 7)
    if (preset === '1m') d.setMonth(d.getMonth() - 1)
    setTempCreatedDate(toLocalDatetimeInput(d.toISOString()))
  }

  // Copy note content
  const copyNoteContent = async () => {
    if (!editor) return
    const text = editor.getText()
    await navigator.clipboard.writeText(text)
    setCopiedText(true)
    setTimeout(() => setCopiedText(false), 2000)
  }

  // Export note as Markdown
  const exportNote = () => {
    if (!activeNote || !editor) return
    const text = editor.getText()
    const blob = new Blob([`# ${activeNote.title}\nCreated: ${formatDateTime(activeNote.createdAt)}\n\n${text}`], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activeNote.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'note'}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Quick insert today's date into text editor
  const insertTodayStamp = () => {
    if (!editor || isReadOnly) return
    const stamp = formatDateTime(new Date().toISOString())
    editor.chain().focus().insertContent(` 📅 **${stamp}** `).run()
  }

  const getNoteSnippet = (html: string) => {
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    return text.length > 70 ? text.substring(0, 70) + '...' : text || 'Empty note...'
  }

  // Text Stats
  const rawText = editor ? editor.getText().trim() : ''
  const wordCount = rawText ? rawText.split(/\s+/).filter(Boolean).length : 0
  const charCount = rawText ? rawText.length : 0
  const readTimeMin = Math.max(1, Math.ceil(wordCount / 200))

  // Editor Toolbar Commands
  const toggleBold = () => editor?.chain().focus().toggleBold().run()
  const toggleItalic = () => editor?.chain().focus().toggleItalic().run()
  const toggleH1 = () => editor?.chain().focus().toggleHeading({ level: 1 }).run()
  const toggleH2 = () => editor?.chain().focus().toggleHeading({ level: 2 }).run()
  const toggleH3 = () => editor?.chain().focus().toggleHeading({ level: 3 }).run()
  const toggleBulletList = () => editor?.chain().focus().toggleBulletList().run()
  const toggleOrderedList = () => editor?.chain().focus().toggleOrderedList().run()
  const toggleBlockquote = () => editor?.chain().focus().toggleBlockquote().run()
  const toggleCode = () => editor?.chain().focus().toggleCode().run()
  const toggleCodeBlock = () => editor?.chain().focus().toggleCodeBlock().run()
  const insertHorizontalRule = () => editor?.chain().focus().setHorizontalRule().run()

  return (
    <div className={cn("p-0 h-full flex flex-col overflow-hidden animate-fade-in bg-background", isFullscreen && "fixed inset-0 z-50 bg-background")}>
      
      {/* ─── Top Control Header Banner ────────────────────────────────────────── */}
      <div className="px-5 py-3 border-b shrink-0 bg-card/60 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-sm text-foreground tracking-tight">Project Notes</h2>
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
              {notes.length} note{notes.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="h-4 w-px bg-border mx-1 hidden sm:block" />

          {/* Search bar */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-background text-xs w-48 sm:w-64">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-transparent outline-none text-foreground"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Color/Tag Filter Pills */}
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border">
            <button
              onClick={() => setColorFilter('all')}
              className={cn("px-2 py-0.5 rounded text-[11px] font-medium transition-colors", colorFilter === 'all' ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground')}
            >
              All
            </button>
            <button
              onClick={() => setColorFilter('pinned')}
              className={cn("px-2 py-0.5 rounded text-[11px] font-medium flex items-center gap-1 transition-colors", colorFilter === 'pinned' ? 'bg-background text-amber-500 font-semibold shadow-xs' : 'text-muted-foreground hover:text-foreground')}
            >
              <Pin className="w-3 h-3 text-amber-500 fill-amber-500/20" /> Pinned
            </button>
          </div>

          {/* Sorting Dropdown */}
          <div className="flex items-center gap-1 text-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground ml-1" />
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as any)}
              className="bg-background border rounded-lg px-2.5 py-1 text-xs outline-none cursor-pointer font-medium text-foreground hover:border-primary/50 transition-colors"
            >
              <option value="custom">Custom Order (Drag)</option>
              <option value="created_desc">Created (Newest First)</option>
              <option value="created_asc">Created (Oldest First)</option>
              <option value="updated_desc">Recently Updated</option>
              <option value="title_asc">Title (A-Z)</option>
            </select>
          </div>

          {/* View Mode Switcher (Split vs Grid) */}
          <div className="flex items-center border rounded-lg overflow-hidden bg-background">
            <button
              onClick={() => setViewMode('split')}
              title="Split View"
              className={cn("p-1.5 transition-colors", viewMode === 'split' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              title="Grid View"
              className={cn("p-1.5 transition-colors", viewMode === 'grid' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* New Note Button */}
          {!isReadOnly && (
            <button
              onClick={handleCreateNote}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/95 transition-all shadow-xs active:scale-95 cursor-pointer ml-1"
            >
              <Plus className="w-3.5 h-3.5" /> New Note
            </button>
          )}
        </div>
      </div>

      {/* ─── Main Content Body ────────────────────────────────────────────────── */}
      {viewMode === 'grid' ? (
        // ─── GRID GALLERY VIEW ──────────────────────────────────────────────
        <div className="flex-1 overflow-y-auto p-6 bg-card/10">
          {filteredNotes.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No notes found"
              description={searchTerm ? "No notes match your search filters." : "Create your first note to organize project documentation."}
              action={!isReadOnly ? <button onClick={handleCreateNote} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">Create Note</button> : undefined}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredNotes.map((note) => {
                const colorObj = NOTE_COLORS.find(c => c.id === note.color) || NOTE_COLORS[0]
                const isSelected = activeNoteId === note.id

                return (
                  <div
                    key={note.id}
                    draggable={!isReadOnly}
                    onDragStart={(e) => handleDragStart(e, note.id)}
                    onDragOver={(e) => handleDragOver(e, note.id)}
                    onDrop={(e) => handleDrop(e, note.id)}
                    onClick={() => { setActiveNoteId(note.id); setViewMode('split') }}
                    className={cn(
                      "p-4 rounded-xl border bg-card hover:shadow-md transition-all flex flex-col justify-between gap-3 relative group cursor-pointer border-t-4",
                      colorObj.border,
                      isSelected && "ring-2 ring-primary",
                      draggedNoteId === note.id && "opacity-40 scale-95",
                      dragOverNoteId === note.id && "border-b-4 border-b-primary shadow-lg"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        {!isReadOnly && sortOption === 'custom' && (
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground cursor-grab active:cursor-grabbing shrink-0" />
                        )}
                        <span className="font-bold text-sm text-foreground truncate">{note.title || 'Untitled Note'}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => togglePinNote(note.id, e)}
                          title={note.pinned ? "Unpin Note" : "Pin Note"}
                          className={cn("p-1 rounded-md hover:bg-muted transition-colors", note.pinned ? 'text-amber-500' : 'text-muted-foreground/40 group-hover:text-muted-foreground')}
                        >
                          <Pin className={cn("w-3.5 h-3.5", note.pinned && "fill-amber-500")} />
                        </button>
                        {!isReadOnly && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(note.id) }}
                            className="p-1 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Content Snippet */}
                    <p className="text-xs text-muted-foreground/90 line-clamp-4 leading-relaxed font-normal">
                      {getNoteSnippet(note.content)}
                    </p>

                    {/* Footer Info */}
                    <div className="pt-2 border-t flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium">
                        <Calendar className="w-3 h-3 text-primary/70" />
                        {formatDate(note.createdAt)}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-semibold uppercase tracking-wider text-[9px]">
                        {colorObj.name}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : (
        // ─── SPLIT VIEW (Sidebar List + Rich Text Editor) ───────────────────────
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Sidebar Notes List */}
          <div className="w-80 shrink-0 border-r bg-card flex flex-col h-full">
            <div className="px-4 py-2 border-b shrink-0 flex items-center justify-between text-xs text-muted-foreground bg-muted/20 font-medium">
              <span>{filteredNotes.length} Note{filteredNotes.length !== 1 ? 's' : ''} Listed</span>
              {!isReadOnly && (
                <span className="text-[10px] text-primary/80 font-medium flex items-center gap-1">
                  <GripVertical className="w-3 h-3 text-primary" /> Drag to reorder
                </span>
              )}
            </div>

            <div className="flex-1 overflow-y-auto divide-y select-none">
              {loading && notes.length === 0 ? (
                <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 text-primary animate-spin" /></div>
              ) : filteredNotes.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">{searchTerm ? 'No matching notes found.' : 'No notes created yet.'}</div>
              ) : (
                filteredNotes.map((note) => {
                  const isActive = note.id === activeNoteId
                  const colorObj = NOTE_COLORS.find(c => c.id === note.color) || NOTE_COLORS[0]
                  const isDragging = draggedNoteId === note.id
                  const isDragOver = dragOverNoteId === note.id

                  return (
                    <div
                      key={note.id}
                      draggable={!isReadOnly}
                      onDragStart={(e) => handleDragStart(e, note.id)}
                      onDragOver={(e) => handleDragOver(e, note.id)}
                      onDragLeave={() => setDragOverNoteId(null)}
                      onDragEnd={() => { setDraggedNoteId(null); setDragOverNoteId(null) }}
                      onDrop={(e) => handleDrop(e, note.id)}
                      onClick={() => setActiveNoteId(note.id)}
                      className={cn(
                        "p-3.5 cursor-pointer hover:bg-muted/50 transition-all flex flex-col items-start gap-1 relative group border-l-4 select-none",
                        colorObj.border,
                        isActive && "bg-muted/80 shadow-xs",
                        isDragging && "opacity-40 scale-95 border-dashed border-primary bg-primary/10",
                        isDragOver && "border-t-2 border-t-primary bg-primary/15 shadow-md ring-1 ring-primary/40"
                      )}
                    >
                      <div className="flex items-center justify-between w-full pr-5">
                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                          {!isReadOnly && (
                            <span
                              title="Drag to reorder note"
                              className="p-0.5 rounded text-muted-foreground/40 group-hover:text-primary hover:bg-muted cursor-grab active:cursor-grabbing shrink-0 transition-colors"
                            >
                              <GripVertical className="w-4 h-4" />
                            </span>
                          )}
                          <span className="font-semibold text-sm text-foreground truncate flex-1">{note.title || 'Untitled Note'}</span>
                        </div>

                        <button
                          onClick={(e) => togglePinNote(note.id, e)}
                          title={note.pinned ? "Unpin Note" : "Pin Note"}
                          className={cn("p-0.5 rounded transition-colors shrink-0", note.pinned ? 'text-amber-500' : 'text-muted-foreground/30 opacity-0 group-hover:opacity-100 hover:text-foreground')}
                        >
                          <Pin className={cn("w-3.5 h-3.5", note.pinned && "fill-amber-500")} />
                        </button>

                        {!isReadOnly && (
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(note.id) }}
                            className="absolute right-2 top-3 p-1 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all duration-200"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <span className="text-xs text-muted-foreground/90 line-clamp-2 w-full leading-relaxed pl-6">
                        {getNoteSnippet(note.content)}
                      </span>

                      <div className="flex items-center justify-between w-full pl-6 mt-1 text-[10px] text-muted-foreground/70">
                        <span className="flex items-center gap-1 font-medium text-muted-foreground">
                          <Calendar className="w-3 h-3 text-primary/80" />
                          Created {formatDate(note.createdAt)}
                        </span>
                        {note.pinned && (
                          <span className="text-amber-500 font-medium text-[9px] uppercase tracking-wider">Pinned</span>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* Right Pane: Rich Editor Pane */}
          <div className="flex-1 flex flex-col h-full bg-card/25 overflow-hidden">
            {activeNote ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                
                {/* ── Editor Metadata & Controls Header ──────────────── */}
                <div className="px-6 py-2.5 border-b shrink-0 flex items-center justify-between bg-card/70 flex-wrap gap-2">
                  
                  {/* Created Date Edit Section */}
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={openEditDateModal}
                      title="Click to edit Created Date"
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border bg-background text-foreground hover:bg-muted hover:border-primary/50 transition-colors font-medium cursor-pointer shadow-2xs"
                    >
                      <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>Created: <strong>{formatDateTime(activeNote.createdAt)}</strong></span>
                      <span className="text-[10px] text-primary/80 underline font-normal ml-0.5">Edit</span>
                    </button>

                    <div className="h-3.5 w-px bg-border mx-0.5" />

                    {/* Note Color Tag Picker */}
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-muted-foreground font-medium mr-1">Color:</span>
                      {NOTE_COLORS.map(c => (
                        <button
                          key={c.id}
                          onClick={(e) => setNoteColor(activeNote.id, c.id, e)}
                          title={c.name}
                          className={cn(
                            "w-4 h-4 rounded-full border transition-all cursor-pointer",
                            c.bg, c.border,
                            activeNote.color === c.id ? "ring-2 ring-primary scale-110" : "hover:scale-105 opacity-80"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Top Right Utilities (Copy, Export, Fullscreen) */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={insertTodayStamp}
                      title="Insert Today's Date Stamp into text"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border bg-background text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      <Clock className="w-3 h-3 text-primary" /> Stamp Date
                    </button>

                    <button
                      onClick={copyNoteContent}
                      title="Copy plain text content"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border bg-background text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      {copiedText ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      {copiedText ? 'Copied!' : 'Copy'}
                    </button>

                    <button
                      onClick={exportNote}
                      title="Export note as Markdown (.md)"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg border bg-background text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                      <Download className="w-3 h-3" /> Export
                    </button>

                    <button
                      onClick={() => setIsFullscreen(!isFullscreen)}
                      title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Focus Mode"}
                      className="p-1.5 rounded-lg border bg-background text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer ml-1"
                    >
                      {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* ── Editor Formatting Toolbar ─────────────────────── */}
                <div className="px-6 py-2 border-b shrink-0 flex items-center justify-between bg-card/50 overflow-x-auto">
                  <div className="flex items-center gap-1 overflow-x-auto select-none py-0.5">
                    {editor && (<>
                      <ToolBtn onClick={toggleBold} active={editor.isActive('bold')} disabled={isReadOnly} title="Bold (Ctrl+B)"><Bold className="w-4 h-4" /></ToolBtn>
                      <ToolBtn onClick={toggleItalic} active={editor.isActive('italic')} disabled={isReadOnly} title="Italic (Ctrl+I)"><Italic className="w-4 h-4" /></ToolBtn>
                      
                      <div className="w-px h-5 bg-border mx-1 shrink-0" />
                      
                      <ToolBtn onClick={toggleH1} active={editor.isActive('heading', { level: 1 })} disabled={isReadOnly} title="Heading 1"><Heading1 className="w-4 h-4" /></ToolBtn>
                      <ToolBtn onClick={toggleH2} active={editor.isActive('heading', { level: 2 })} disabled={isReadOnly} title="Heading 2"><Heading2 className="w-4 h-4" /></ToolBtn>
                      <ToolBtn onClick={toggleH3} active={editor.isActive('heading', { level: 3 })} disabled={isReadOnly} title="Heading 3"><Heading3 className="w-4 h-4" /></ToolBtn>
                      
                      <div className="w-px h-5 bg-border mx-1 shrink-0" />
                      
                      <ToolBtn onClick={toggleBulletList} active={editor.isActive('bulletList')} disabled={isReadOnly} title="Bullet List (Tab to indent)"><List className="w-4 h-4" /></ToolBtn>
                      <ToolBtn onClick={toggleOrderedList} active={editor.isActive('orderedList')} disabled={isReadOnly} title="Numbered List"><ListOrdered className="w-4 h-4" /></ToolBtn>
                      <ToolBtn onClick={insertHorizontalRule} disabled={isReadOnly} title="Horizontal Divider Line"><Minus className="w-4 h-4" /></ToolBtn>

                      <div className="w-px h-5 bg-border mx-1 shrink-0" />
                      
                      <ToolBtn onClick={toggleBlockquote} active={editor.isActive('blockquote')} disabled={isReadOnly} title="Blockquote"><Quote className="w-4 h-4" /></ToolBtn>
                      <ToolBtn onClick={toggleCode} active={editor.isActive('code')} disabled={isReadOnly} title="Inline Code"><Code className="w-4 h-4" /></ToolBtn>
                      <ToolBtn onClick={toggleCodeBlock} active={editor.isActive('codeBlock')} disabled={isReadOnly} title="Code Block"><SquareTerminal className="w-4 h-4" /></ToolBtn>
                      
                      {!isReadOnly && (projectFiles.length > 0 || projectFolders.length > 0) && (
                        <>
                          <div className="w-px h-5 bg-border mx-1 shrink-0" />
                          <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-medium px-1 shrink-0">
                            <Paperclip className="w-3 h-3 text-primary" /> Type <strong>[</strong> for files & folders
                          </div>
                        </>
                      )}
                    </>)}
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground select-none shrink-0 font-medium pl-3">
                    {savingStatus === 'saving' && <span className="flex items-center gap-1.5 text-amber-500 font-semibold"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving</span>}
                    {savingStatus === 'saved' && <span className="flex items-center gap-1.5 text-emerald-500 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> Saved</span>}
                  </div>
                </div>

                {/* ── Editor Canvas ─────────────────────────────────── */}
                <div className="flex-1 flex flex-col p-6 overflow-hidden bg-background">
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={localTitle}
                    onChange={handleTitleChange}
                    placeholder="Note title..."
                    className="w-full text-2xl font-bold bg-transparent border-none outline-none mb-3 pr-10 shrink-0 text-foreground placeholder:text-muted-foreground/50"
                  />
                  <div className="flex-1 border rounded-xl overflow-hidden bg-card flex flex-col tiptap-editor shadow-sm">
                    <EditorContent editor={editor} className="flex-1 overflow-y-auto p-4 leading-relaxed" />
                  </div>
                </div>

                {/* ── Editor Status Footer / Stats Bar ─────────────── */}
                <div className="px-6 py-2 border-t shrink-0 flex items-center justify-between text-xs text-muted-foreground bg-card/60">
                  <div className="flex items-center gap-4">
                    <span><strong>{wordCount}</strong> words</span>
                    <span><strong>{charCount}</strong> characters</span>
                    <span>~<strong>{readTimeMin}</strong> min read</span>
                  </div>
                  <div className="text-[11px] text-muted-foreground/70">
                    Press <kbd className="px-1.5 py-0.5 bg-muted rounded border text-[10px] font-mono">Tab</kbd> to indent text
                  </div>
                </div>

              </div>
            ) : (
              <EmptyState
                icon={FileText}
                title="No note selected"
                description="Select an existing note from the sidebar list or write a new one to store project context."
                action={!isReadOnly ? <button onClick={handleCreateNote} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">Create Note</button> : undefined}
              />
            )}
          </div>
        </div>
      )}

      {/* ─── EDIT CREATED DATE MODAL ─────────────────────────────────────────── */}
      {editingDateModalOpen && activeNote && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-card border rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-scale-in">
            <div className="flex items-center gap-2 border-b pb-3">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-base text-foreground">Edit Note Created Date</h3>
            </div>

            <p className="text-xs text-muted-foreground">
              Modify the timestamp for when <strong>"{activeNote.title || 'Untitled Note'}"</strong> was created.
            </p>

            {/* Date Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Created Date & Time</label>
              <input
                type="datetime-local"
                value={tempCreatedDate}
                onChange={(e) => setTempCreatedDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border bg-background text-sm font-mono outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              />
            </div>

            {/* Quick Presets */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">Quick Presets:</label>
              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setQuickPresetDate('now')} className="px-2.5 py-1 bg-muted hover:bg-primary/10 hover:text-primary rounded-md text-xs font-medium transition-colors">Now</button>
                <button onClick={() => setQuickPresetDate('1h')} className="px-2.5 py-1 bg-muted hover:bg-primary/10 hover:text-primary rounded-md text-xs font-medium transition-colors">1 Hour Ago</button>
                <button onClick={() => setQuickPresetDate('1d')} className="px-2.5 py-1 bg-muted hover:bg-primary/10 hover:text-primary rounded-md text-xs font-medium transition-colors">1 Day Ago</button>
                <button onClick={() => setQuickPresetDate('1w')} className="px-2.5 py-1 bg-muted hover:bg-primary/10 hover:text-primary rounded-md text-xs font-medium transition-colors">1 Week Ago</button>
                <button onClick={() => setQuickPresetDate('1m')} className="px-2.5 py-1 bg-muted hover:bg-primary/10 hover:text-primary rounded-md text-xs font-medium transition-colors">1 Month Ago</button>
              </div>
            </div>

            {/* Modal Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                onClick={() => setEditingDateModalOpen(false)}
                className="px-4 py-2 border rounded-lg text-xs font-medium hover:bg-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCreatedDate}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/95 transition-colors cursor-pointer"
              >
                Save Date
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── File/Folder Autocomplete Dropdown ───────────────────────────────── */}
      {autocomplete.visible && filteredMatches.length > 0 && (
        <div
          ref={autocompleteRef}
          className="fixed z-[9999] bg-card border rounded-xl shadow-2xl py-1.5 w-64 animate-scale-in"
          style={{ left: Math.min(autocomplete.x, window.innerWidth - 280), top: autocomplete.y }}
          onMouseDown={e => e.preventDefault()}
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider border-b mb-1">
            References — {filteredMatches.length} match{filteredMatches.length !== 1 ? 'es' : ''}
          </div>
          {filteredMatches.map((item, idx) => {
            const IconComponent = item.type === 'folder' ? Folder : getFileIcon(item.mimeType || '')
            return (
              <button
                key={item.id}
                onMouseDown={() => insertRef.current(item)}
                className={cn(
                  "flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium transition-colors cursor-pointer text-left",
                  idx === autocomplete.selectedIndex ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'
                )}
              >
                <IconComponent className={cn("w-3.5 h-3.5 shrink-0", idx === autocomplete.selectedIndex ? 'text-primary' : (item.type === 'folder' ? 'text-amber-500' : 'text-muted-foreground'))} />
                <span className="truncate">{item.name}</span>
              </button>
            )
          })}
          <div className="px-3 pt-1.5 pb-1 text-[10px] text-muted-foreground border-t mt-1">
            ↑↓ navigate · Enter/Tab insert · Esc cancel
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDeleteNote}
        title="Delete Note"
        description="Are you sure you want to permanently delete this note? All rich text content will be lost."
        variant="danger"
        confirmLabel="Delete Note"
      />
    </div>
  )
}

function ToolBtn({ onClick, active, disabled, title, children }: { onClick: () => void; active?: boolean; disabled?: boolean; title?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer",
        active && "bg-primary/10 text-primary hover:bg-primary/20"
      )}
    >
      {children}
    </button>
  )
}