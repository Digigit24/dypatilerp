import { USE_MOCK } from '../config.js'

export const delay = async (min = 150, max = 400) => {
  if (USE_MOCK) await new Promise((r) => setTimeout(r, Math.floor(min + Math.random() * (max - min))))
}

export const ok = (data, extra = {}) => ({ data, error: null, ...extra })
export const notFound = () => ({ data: null, error: 'Not found' })
export const byId = (items, id) => items.find((item) => item.id === id)
export const applyFilters = (items, filters = {}) => items.filter((item) => Object.entries(filters).every(([key, value]) => !value || String(item[key] ?? '').toLowerCase() === String(value).toLowerCase()))
