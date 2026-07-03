import { useEffect, useState } from 'react'
import {
  BarChart3,
  Briefcase,
  Compass,
  FolderOpen,
  LayoutDashboard,
  UserCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { navigate } from '@/router'
import { useQuickAddOptional } from '@/contexts/QuickAddContext'

interface CommandMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const { t } = useTranslation()
  const quickAdd = useQuickAddOptional()

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  const run = (fn: () => void) => {
    fn()
    onOpenChange(false)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder={t('common.searchPagesActions')} />
      <CommandList>
        <CommandEmpty>{t('common.noResults')}</CommandEmpty>
        <CommandGroup heading={t('nav.navigationGroup')}>
          <CommandItem onSelect={() => run(() => navigate({ page: 'dashboard' }))}>
            <LayoutDashboard className="h-4 w-4" />
            {t('nav.today')}
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate({ page: 'candidature' }))}>
            <Briefcase className="h-4 w-4" />
            {t('nav.applications')}
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate({ page: 'candidature', view: 'pipeline' }))}>
            <Briefcase className="h-4 w-4" />
            {t('candidature.views.pipeline')}
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate({ page: 'discover' }))}>
            <Compass className="h-4 w-4" />
            {t('nav.discover')}
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate({ page: 'progress' }))}>
            <BarChart3 className="h-4 w-4" />
            {t('nav.progress')}
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate({ page: 'documents' }))}>
            <FolderOpen className="h-4 w-4" />
            {t('nav.resources')}
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate({ page: 'account' }))}>
            <UserCircle className="h-4 w-4" />
            {t('nav.account')}
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading={t('nav.actionsGroup')}>
          <CommandItem onSelect={() => run(() => quickAdd?.openQuickAdd())}>
            <Briefcase className="h-4 w-4" />
            {t('nav.newApplication')}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}

export function useCommandMenu() {
  const [open, setOpen] = useState(false)
  return { open, setOpen }
}
