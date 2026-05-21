import { ArrowLeft } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import StudentProfileView from '../../components/shared/StudentProfileView.jsx'
import PageHeader from '../../components/shared/PageHeader.jsx'

export default function StudentProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()

  return (
    <div className="fade-page">
      <PageHeader
        title="Student Profile"
        subtitle="View and edit the student's complete profile and research record."
        action={
          <button
            className="inline-flex items-center gap-2 rounded-2xl border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-2.5 text-sm font-semibold text-[color:var(--secondary)]"
            onClick={() => navigate('/admin/students')}
          >
            <ArrowLeft size={15} /> All Students
          </button>
        }
      />
      <StudentProfileView studentId={id} isAdminView={true} />
    </div>
  )
}
