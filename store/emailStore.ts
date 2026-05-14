import { create } from "zustand"

interface EmailStore {
  selectedEmailId: string | null
  currentFolder: string
  searchQuery: string
  selectedAccountId: string | null
  isComposeOpen: boolean
  isSidebarOpen: boolean
  replyToEmailId: string | null
  setSelectedEmailId: (id: string | null) => void
  setCurrentFolder: (folder: string) => void
  setSearchQuery: (query: string) => void
  setSelectedAccountId: (id: string | null) => void
  setIsComposeOpen: (open: boolean) => void
  setIsSidebarOpen: (open: boolean) => void
  setReplyToEmailId: (id: string | null) => void
}

export const useEmailStore = create<EmailStore>((set) => ({
  selectedEmailId: null,
  currentFolder: "INBOX",
  searchQuery: "",
  selectedAccountId: null,
  isComposeOpen: false,
  isSidebarOpen: false,
  replyToEmailId: null,
  setSelectedEmailId: (id) => set({ selectedEmailId: id }),
  setCurrentFolder: (folder) => set({ currentFolder: folder, selectedEmailId: null }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSelectedAccountId: (id) => set({ selectedAccountId: id }),
  setIsComposeOpen: (open) => set({ isComposeOpen: open }),
  setIsSidebarOpen: (open) => set({ isSidebarOpen: open }),
  setReplyToEmailId: (id) => set({ replyToEmailId: id }),
}))
