import { useEffect } from 'react'

let lockCount = 0
let previousOverflow = ''
let previousHtmlOverflow = ''
let previousPosition = ''
let previousTop = ''
let previousWidth = ''
let scrollY = 0

export default function useScrollLock(locked) {
  useEffect(() => {
    if (!locked || typeof document === 'undefined') return undefined

    if (lockCount === 0) {
      scrollY = window.scrollY || document.documentElement.scrollTop || 0
      previousOverflow = document.body.style.overflow
      previousHtmlOverflow = document.documentElement.style.overflow
      previousPosition = document.body.style.position
      previousTop = document.body.style.top
      previousWidth = document.body.style.width
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
    }
    lockCount += 1

    return () => {
      lockCount = Math.max(0, lockCount - 1)
      if (lockCount === 0) {
        document.documentElement.style.overflow = previousHtmlOverflow
        document.body.style.overflow = previousOverflow
        document.body.style.position = previousPosition
        document.body.style.top = previousTop
        document.body.style.width = previousWidth
        window.scrollTo(0, scrollY)
      }
    }
  }, [locked])
}
