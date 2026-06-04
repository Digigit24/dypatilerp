import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs) => twMerge(clsx(inputs))
export const initials = (first = '', last = '') => `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase() || 'DP'
export const roleLabel = (role = '') => (role ?? '').split('_').map((p) => p[0]?.toUpperCase() + p.slice(1)).join(' ')
