import { Menu, Plus, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { useQuickAddOptional } from '@/contexts/QuickAddContext'

interface AppHeaderProps {
  onOpenCommand: () => void
  onOpenNav: () => void
}

export function AppHeader({ onOpenCommand, onOpenNav }: AppHeaderProps) {
  const { t } = useTranslation()
  const quickAdd = useQuickAddOptional()

  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border/80 bg-background/85 px-4 py-3 backdrop-blur-md sm:px-6">
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="lg:hidden"
        onClick={onOpenNav}
        aria-label={t('nav.menu')}
      >
        <Menu className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        className="hidden flex-1 max-w-md justify-start gap-2 text-muted-foreground sm:inline-flex"
        onClick={onOpenCommand}
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">{t('common.search')}</span>
        <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:flex">
          ⌘K
        </kbd>
      </Button>

      <div className="flex-1 sm:hidden" />

      <Button size="sm" className="shadow-sm" onClick={() => quickAdd?.openQuickAdd()}>
        <Plus className="h-4 w-4" />
        <span className="hidden xs:inline sm:inline">{t('nav.applicationShort')}</span>
      </Button>
    </header>
  )
}
