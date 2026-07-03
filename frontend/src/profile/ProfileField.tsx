import type { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

interface ProfileFieldProps {
  id: string
  label: string
  icon: ReactNode
  children: ReactNode
}

export function ProfileField({ id, label, icon, children }: ProfileFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-2 text-muted-foreground">
        <span className="flex h-4 w-4 shrink-0 items-center justify-center [&_svg]:h-4 [&_svg]:w-4">
          {icon}
        </span>
        {label}
      </Label>
      <div>{children}</div>
    </div>
  )
}
