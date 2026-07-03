import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { QuickAddDialog } from '@/applications/QuickAddDialog'

interface QuickAddContextValue {
  openQuickAdd: () => void
  refreshKey: number
  bumpRefresh: () => void
}

const QuickAddContext = createContext<QuickAddContextValue | null>(null)

export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const value = useMemo(
    () => ({
      openQuickAdd: () => setOpen(true),
      refreshKey,
      bumpRefresh: () => setRefreshKey((k) => k + 1),
    }),
    [refreshKey]
  )

  return (
    <QuickAddContext.Provider value={value}>
      {children}
      <QuickAddDialog
        open={open}
        onOpenChange={setOpen}
        onSaved={() => setRefreshKey((k) => k + 1)}
      />
    </QuickAddContext.Provider>
  )
}

export function useQuickAdd() {
  const ctx = useContext(QuickAddContext)
  if (!ctx) throw new Error('useQuickAdd must be used within QuickAddProvider')
  return ctx
}

export function useQuickAddOptional() {
  return useContext(QuickAddContext)
}
