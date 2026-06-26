import { create } from 'zustand'

export interface Note {
  id: string
  projectId: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

interface NoteState {
  notes: Note[]
  loading: boolean
  error: string | null
  fetchNotes: (projectId: string) => Promise<void>
  createNote: (data: { projectId: string; title: string; content?: string }) => Promise<Note>
  updateNoteLocal: (id: string, data: { title?: string; content?: string }) => void
  updateNote: (id: string, data: { title?: string; content?: string }) => Promise<void>
  deleteNote: (id: string) => Promise<void>
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  loading: false,
  error: null,

  fetchNotes: async (projectId) => {
    set({ loading: true, error: null })
    try {
      const notes = await window.api.notes.getByProject(projectId)
      set({ notes, loading: false })
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
    }
  },

  createNote: async (data) => {
    set({ loading: true, error: null })
    try {
      const note = await window.api.notes.create(data)
      await get().fetchNotes(data.projectId)
      return note
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  },

  updateNoteLocal: (id, data) => {
    set(state => ({
      notes: state.notes.map(n => n.id === id ? { ...n, ...data, updatedAt: new Date().toISOString() } : n)
    }))
  },

  updateNote: async (id, data) => {
    try {
      // Optimistically update the store state first
      set(state => ({
        notes: state.notes.map(n => n.id === id ? { ...n, ...data, updatedAt: new Date().toISOString() } : n)
      }))
      // Write to database in the background
      await window.api.notes.update(id, data)
    } catch (err) {
      set({ error: (err as Error).message })
      throw err
    }
  },

  deleteNote: async (id) => {
    set({ loading: true, error: null })
    try {
      const note = get().notes.find(n => n.id === id)
      await window.api.notes.delete(id)
      if (note) {
        await get().fetchNotes(note.projectId)
      } else {
        set({ loading: false })
      }
    } catch (err) {
      set({ error: (err as Error).message, loading: false })
      throw err
    }
  }
}))
