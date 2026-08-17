/**
 * Student's full-page Submissions view — Progress Reports / Assignments /
 * Milestones, exactly as StudentProfileView renders them, just as its own
 * dedicated page instead of a tab buried inside "My Profile". Reachable from
 * the "Submissions" sidenav item (see StudentLayout.jsx).
 */
import PageHeader from '../../components/shared/PageHeader.jsx'
import StudentProfileView from '../../components/shared/StudentProfileView.jsx'
import { useAuthStore } from '../../store/authStore.js'

export default function SubmissionsPage() {
  const currentUser = useAuthStore((s) => s.currentUser)
  return (
    <div className="fade-page">
      <PageHeader title="Submissions" subtitle="Your progress reports, assignments and milestones, all in one place." />
      {currentUser?.id && <StudentProfileView studentId={currentUser.id} isAdminView={false} defaultTab="submissions" showHeader={false} />}
    </div>
  )
}
