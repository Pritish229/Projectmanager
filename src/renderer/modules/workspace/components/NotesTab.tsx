import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react'
import { useNoteStore } from '@/stores/useNoteStore'
import { ConfirmDialog, EmptyState } from '@/components/shared'
import { cn, formatDateTime } from '@/lib/utils'
import {
  Plus, Search, Trash2, Bold, Italic, Heading1, Heading2, List, ListOrdered,
  Quote, Code, SquareTerminal, RefreshCw, FileText, CheckCircle2, Paperclip,
  File, Image, FileSpreadsheet, Archive, Music, Video, Folder
} from 'lucide-react'

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

// ─── Types ────────────────────────────────────────────────────────────────────
interface NotesTabProps { projectId: string; isReadOnly: boolean }
interface ProjectFile { id: string; originalName: string; mimeType: string }
interface ProjectFolder { id: string; name: string }
interface AutocompleteState { visible: boolean; query: string; x: number; y: number; selectedIndex: number }

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

  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const prevActiveNoteIdRef = useRef<string | null>(null)
  const currentContentRef = useRef<string>('')
  const currentTitleRef = useRef<string>('')
  const autocompleteRef = useRef<HTMLDivElement>(null)

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

  const filteredNotes = useMemo(() => notes.filter(n =>
    n.title.toLowerCase().includes(searchTerm.toLowerCase()) || n.content.toLowerCase().includes(searchTerm.toLowerCase())
  ), [notes, searchTerm])

  const activeNote = useMemo(() => notes.find(n => n.id === activeNoteId) || null, [notes, activeNoteId])

  interface AutocompleteItem { type: 'file' | 'folder'; id: string; name: string; mimeType?: string }

  const filteredMatches = useMemo((): AutocompleteItem[] => {
    const q = autocomplete.query.toLowerCase()
    
    const folderMatches = projectFolders
      .filter(f => f.name.toLowerCase().includes(q))
      .map(f => ({
        type: 'folder' as const,
        id: f.id,
        name: f.name
      }))

    const fileMatches = projectFiles
      .filter(f => f.originalName.toLowerCase().includes(q))
      .map(f => ({
        type: 'file' as const,
        id: f.id,
        name: f.originalName,
        mimeType: f.mimeType
      }))

    return [...folderMatches, ...fileMatches].slice(0, 8)
  }, [projectFiles, projectFolders, autocomplete.query])

  // ─── Autocomplete ──────────────────────────────────────────────────────────
  const closeAutocomplete = useCallback(() => {
    setAutocomplete(prev => ({ ...prev, visible: false, query: '', selectedIndex: 0 }))
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start typing... Use [ to reference a file or folder' }),
      FileReferenceNode,
      FolderReferenceNode
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
          // Get caret position for popup placement
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
    // Delete the "[query" text that triggered autocomplete
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

  // Assign insertReference to ref so it has stable identity
  const insertRef = useRef(insertReference)
  useEffect(() => { insertRef.current = insertReference }, [insertReference])

  // Keyboard navigation for autocomplete
  useEffect(() => {
    if (!autocomplete.visible) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setAutocomplete(prev => ({ ...prev, selectedIndex: Math.min(prev.selectedIndex + 1, filteredMatches.length - 1) })) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setAutocomplete(prev => ({ ...prev, selectedIndex: Math.max(prev.selectedIndex - 1, 0) })) }
      else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); const item = filteredMatches[autocomplete.selectedIndex]; if (item) insertRef.current(item) }
      else if (e.key === 'Escape') { closeAutocomplete() }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [autocomplete.visible, autocomplete.selectedIndex, filteredMatches, closeAutocomplete])

  useEffect(() => {
    if (timeoutRef.current && prevActiveNoteIdRef.current) {
      clearTimeout(timeoutRef.current)
      updateNote(prevActiveNoteIdRef.current, { title: currentTitleRef.current, content: currentContentRef.current })
      setSavingStatus('saved')
    }
    if (activeNote) {
      setLocalTitle(activeNote.title || ''); currentTitleRef.current = activeNote.title || ''; currentContentRef.current = activeNote.content || ''
      if (editor) editor.commands.setContent(activeNote.content || '')
    } else {
      setLocalTitle(''); currentTitleRef.current = ''; currentContentRef.current = ''
    }
    prevActiveNoteIdRef.current = activeNoteId
  }, [activeNoteId, editor])

  useEffect(() => { if (editor) editor.setEditable(!isReadOnly) }, [isReadOnly, editor])

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
    setActiveNoteId(newNote.id)
  }
  const handleDeleteNote = async () => {
    if (deleteConfirmId) { await deleteNote(deleteConfirmId); if (activeNoteId === deleteConfirmId) setActiveNoteId(null); setDeleteConfirmId(null) }
  }
  const getNoteSnippet = (html: string) => {
    const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
    return text.length > 55 ? text.substring(0, 55) + '...' : text || 'Empty note...'
  }
  const toggleBold = () => editor?.chain().focus().toggleBold().run()
  const toggleItalic = () => editor?.chain().focus().toggleItalic().run()
  const toggleH1 = () => editor?.chain().focus().toggleHeading({ level: 1 }).run()
  const toggleH2 = () => editor?.chain().focus().toggleHeading({ level: 2 }).run()
  const toggleBulletList = () => editor?.chain().focus().toggleBulletList().run()
  const toggleOrderedList = () => editor?.chain().focus().toggleOrderedList().run()
  const toggleBlockquote = () => editor?.chain().focus().toggleBlockquote().run()
  const toggleCode = () => editor?.chain().focus().toggleCode().run()
  const toggleCodeBlock = () => editor?.chain().focus().toggleCodeBlock().run()

  return (
    <div className="p-0 h-full flex overflow-hidden animate-fade-in">
      {/* Left Sidebar */}
      <div className="w-80 shrink-0 border-r bg-card flex flex-col h-full">
        <div className="p-4 border-b shrink-0 space-y-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-background">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="Search notes..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-1 bg-transparent text-xs outline-none" />
          </div>
          {!isReadOnly && (
            <button onClick={handleCreateNote} className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/95 transition-colors shadow-sm">
              <Plus className="w-4 h-4" /> New Note
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto divide-y select-none">
          {loading && notes.length === 0 ? (
            <div className="flex items-center justify-center py-12"><RefreshCw className="w-5 h-5 text-primary animate-spin" /></div>
          ) : filteredNotes.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">{searchTerm ? 'No matching notes found.' : 'No notes created yet.'}</div>
          ) : filteredNotes.map((note) => {
            const isActive = note.id === activeNoteId
            return (
              <div key={note.id} onClick={() => setActiveNoteId(note.id)} className={cn("p-4 cursor-pointer hover:bg-muted/40 transition-colors flex flex-col items-start gap-1 relative group", isActive && "bg-muted/60")}>
                {!isReadOnly && (
                  <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(note.id) }} className="absolute right-3 top-3 p-1 rounded-md text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all duration-200">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <span className="font-semibold text-sm text-foreground pr-6 truncate w-full">{note.title || 'Untitled Note'}</span>
                <span className="text-xs text-muted-foreground/90 line-clamp-2 w-full leading-relaxed">{getNoteSnippet(note.content)}</span>
                <span className="text-[10px] text-muted-foreground/60 mt-1">Updated {formatDateTime(note.updatedAt)}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right Pane: Editor */}
      <div className="flex-1 flex flex-col h-full bg-card/25 overflow-hidden">
        {activeNote ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Toolbar */}
            <div className="px-6 py-3 border-b shrink-0 flex items-center justify-between bg-card/50">
              <div className="flex items-center gap-1 overflow-x-auto pr-4 select-none">
                {editor && (<>
                  <ToolBtn onClick={toggleBold} active={editor.isActive('bold')} disabled={isReadOnly}><Bold className="w-4 h-4" /></ToolBtn>
                  <ToolBtn onClick={toggleItalic} active={editor.isActive('italic')} disabled={isReadOnly}><Italic className="w-4 h-4" /></ToolBtn>
                  <div className="w-px h-5 bg-border mx-1 shrink-0" />
                  <ToolBtn onClick={toggleH1} active={editor.isActive('heading', { level: 1 })} disabled={isReadOnly}><Heading1 className="w-4 h-4" /></ToolBtn>
                  <ToolBtn onClick={toggleH2} active={editor.isActive('heading', { level: 2 })} disabled={isReadOnly}><Heading2 className="w-4 h-4" /></ToolBtn>
                  <div className="w-px h-5 bg-border mx-1 shrink-0" />
                  <ToolBtn onClick={toggleBulletList} active={editor.isActive('bulletList')} disabled={isReadOnly}><List className="w-4 h-4" /></ToolBtn>
                  <ToolBtn onClick={toggleOrderedList} active={editor.isActive('orderedList')} disabled={isReadOnly}><ListOrdered className="w-4 h-4" /></ToolBtn>
                  <div className="w-px h-5 bg-border mx-1 shrink-0" />
                  <ToolBtn onClick={toggleBlockquote} active={editor.isActive('blockquote')} disabled={isReadOnly}><Quote className="w-4 h-4" /></ToolBtn>
                  <ToolBtn onClick={toggleCode} active={editor.isActive('code')} disabled={isReadOnly}><Code className="w-4 h-4" /></ToolBtn>
                  <ToolBtn onClick={toggleCodeBlock} active={editor.isActive('codeBlock')} disabled={isReadOnly}><SquareTerminal className="w-4 h-4" /></ToolBtn>
                  {!isReadOnly && (projectFiles.length > 0 || projectFolders.length > 0) && (
                    <>
                      <div className="w-px h-5 bg-border mx-1 shrink-0" />
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium px-1 shrink-0">
                        <Paperclip className="w-3 h-3" /> Type [ to reference a file or folder
                      </div>
                    </>
                  )}
                </>)}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground select-none shrink-0 font-medium pr-1">
                {savingStatus === 'saving' && <span className="flex items-center gap-1.5 text-amber-500 font-semibold"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving changes</span>}
                {savingStatus === 'saved' && <span className="flex items-center gap-1.5 text-emerald-500 font-semibold"><CheckCircle2 className="w-3.5 h-3.5" /> All changes saved</span>}
              </div>
            </div>
            {/* Editor Content */}
            <div className="flex-1 flex flex-col p-6 overflow-hidden">
              <input type="text" disabled={isReadOnly} value={localTitle} onChange={handleTitleChange} placeholder="Title..."
                className="w-full text-2xl font-bold bg-transparent border-none outline-none mb-4 pr-10 shrink-0 text-foreground" />
              <div className="flex-1 border rounded-xl overflow-hidden bg-card flex flex-col tiptap-editor shadow-sm">
                <EditorContent editor={editor} className="flex-1 overflow-y-auto" />
              </div>
            </div>
          </div>
        ) : (
          <EmptyState icon={FileText} title="No note selected"
            description="Select an existing note from the sidebar list or write a new one to store project context."
            action={!isReadOnly ? <button onClick={handleCreateNote} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">Create Note</button> : undefined} />
        )}
      </div>

      {/* File/Folder Autocomplete Dropdown */}
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
              <button key={item.id} onMouseDown={() => insertRef.current(item)}
                className={cn("flex items-center gap-2.5 w-full px-3 py-2 text-xs font-medium transition-colors cursor-pointer text-left", idx === autocomplete.selectedIndex ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground')}>
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

      <ConfirmDialog open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)} onConfirm={handleDeleteNote}
        title="Delete Note" description="Are you sure you want to permanently delete this note? All rich text content will be lost." variant="danger" confirmLabel="Delete Note" />
    </div>
  )
}

function ToolBtn({ onClick, active, disabled, children }: { onClick: () => void; active?: boolean; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={disabled} className={cn("p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0", active && "bg-primary/10 text-primary hover:bg-primary/20")}>
      {children}
    </button>
  )
}