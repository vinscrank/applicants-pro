import type { ReactNode, HTMLAttributes } from 'react'

interface Props extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  interactive?: boolean
}

export function Card({ children, interactive, className = '', ...props }: Props) {
  const classes = ['ui-card', interactive && 'ui-card-interactive', className]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  )
}
