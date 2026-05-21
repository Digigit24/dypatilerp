import { useUiStore } from '../../store/uiStore.js'

const styles = { success: 'bg-emerald-600', error: 'bg-red-600', info: 'bg-indigo-600', warning: 'bg-amber-600' }
export default function ToastHost() {
  const toasts = useUiStore((s) => s.toasts)
  return <div className="fixed right-6 top-6 z-[60] space-y-2">{toasts.map((t) => <div key={t.id} className={`rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-hover ${styles[t.type] || styles.info}`}>{t.title || t.message}</div>)}</div>
}
