import { useEffect, type RefObject } from 'react'

export function useFocusTrap<T extends HTMLElement>(ref: RefObject<T | null>, active: boolean) {
  useEffect(() => {
    const container = ref.current
    if (!active || !container) return
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const getFocusable = () => [...container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )].filter(element => element.getClientRects().length > 0)
    const focusable = getFocusable()
    ;(focusable[0] ?? container).focus()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const current = getFocusable()
      if (!current.length) {
        event.preventDefault()
        container.focus()
        return
      }
      const first = current[0]
      const last = current[current.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus()
    }
  }, [active, ref])
}
