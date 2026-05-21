import { format, formatDistanceToNow } from 'date-fns'

export const formatDate = (value) => (value ? format(new Date(value), 'dd MMM yyyy') : '-')
export const timeAgo = (value) => (value ? formatDistanceToNow(new Date(value), { addSuffix: true }) : '')
