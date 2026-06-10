import StudentProfileView from '../../components/shared/StudentProfileView.jsx'
import PageHeader from '../../components/shared/PageHeader.jsx'
import { useAuthStore } from '../../store/authStore.js'

export default function ProfilePage() {
  const currentUser = useAuthStore((s) => s.currentUser)
  return (
    <div className="fade-page">
      <PageHeader title="My Profile" subtitle="Manage your academic profile, certificates, and research record." />
      {currentUser?.id && <StudentProfileView studentId={currentUser.id} isAdminView={false} />}
    </div>
  )
}
