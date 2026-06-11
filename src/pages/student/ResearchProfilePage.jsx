import PageHeader from '../../components/shared/PageHeader.jsx'
import StudentProfileView from '../../components/shared/StudentProfileView.jsx'
import { useAuthStore } from '../../store/authStore.js'

export default function ResearchProfilePage() {
  const currentUser = useAuthStore((s) => s.currentUser)
  return (
    <div className="fade-page">
      <PageHeader
        title="Research Profile"
        subtitle="Manage your research papers, patents, publications, workshops, and skills."
      />
      {currentUser?.id && (
        <StudentProfileView
          studentId={currentUser.id}
          isAdminView={false}
          defaultTab="research"
        />
      )}
    </div>
  )
}
