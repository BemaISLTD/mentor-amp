import type { ReactNode } from 'react'

export function IconBubble({ children, dark = false, lime = false }: { children: ReactNode; dark?: boolean; lime?: boolean }) {
  return <span className={`icon-bubble ${dark ? 'icon-bubble-dark' : ''} ${lime ? 'icon-bubble-lime' : ''}`}>{children}</span>
}
