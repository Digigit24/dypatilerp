/**
 * Email Templates API service (admin only).
 *
 * Wraps /api/email-templates:
 *   - list / get template definitions (default + override + variables)
 *   - save an override (subject + body)
 *   - reset a template to default
 *   - render a live preview with sample data
 */

import http from '../http.js'
import { USE_MOCK } from '../config.js'

/** List all templates with their defaults, overrides and variable metadata. */
export const listTemplates = async () => {
  if (USE_MOCK) return { data: [] }
  const { data: res } = await http.get('/email-templates')
  return { data: res.data }
}

/** Get a single template definition. */
export const getTemplate = async (key) => {
  const { data: res } = await http.get(`/email-templates/${key}`)
  return { data: res.data }
}

/** Save an override { subject, body } for a template. */
export const saveTemplate = async (key, { subject, body }) => {
  const { data: res } = await http.put(`/email-templates/${key}`, { subject, body })
  return { data: res.data }
}

/** Reset a template to its built-in default (removes the override). */
export const resetTemplate = async (key) => {
  const { data: res } = await http.delete(`/email-templates/${key}`)
  return { data: res.data }
}

/** Render a live preview { subject, html } from unsaved subject/body. */
export const previewTemplate = async (key, { subject, body, data } = {}) => {
  const { data: res } = await http.post(`/email-templates/${key}/preview`, { subject, body, data })
  return { data: res.data }
}
