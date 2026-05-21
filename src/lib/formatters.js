import { format, formatDistanceToNow } from 'date-fns'

export const formatDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : format(date, 'dd MMM yyyy')
}

export const timeAgo = (value) => {
  if (!value) return ''
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : formatDistanceToNow(date, { addSuffix: true })
}
