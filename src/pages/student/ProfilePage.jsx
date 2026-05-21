import StudentProfileView from '../../components/shared/StudentProfileView.jsx'
import PageHeader from '../../components/shared/PageHeader.jsx'

export default function ProfilePage() {
  return (
    <div className="fade-page">
      <PageHeader title="My Profile" subtitle="Manage your academic profile, certificates, and research record." />
      <StudentProfileView studentId="stu_001" isAdminView={false} />
    </div>
  )
}
