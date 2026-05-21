import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, CheckCircle2, FileText, GraduationCap, LayoutDashboard, PlayCircle, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { z } from 'zod'
import { createApplicant } from '../../api/services/applicantService.js'
import { useUiStore } from '../../store/uiStore.js'

const schema = z.object({
  first_name: z.string().min(2, 'Enter your first name'),
  last_name: z.string().min(2, 'Enter your last name'),
  email: z.string().email('Enter a valid email id'),
  mobile: z.string().min(8, 'Enter a valid mobile number'),
  phd_completion_year: z.coerce.number().min(1970, 'Enter a valid year').max(2026, 'Enter a valid year'),
  phd_discipline: z.string().min(2, 'Enter your PhD discipline or field'),
  phd_research_title: z.string().min(5, 'Enter your PhD research title'),
  scopus_publications: z.coerce.number().min(0, 'Enter 0 or more').max(300, 'Enter a realistic publication count'),
  state_country: z.string().min(2, 'Enter your state and country'),
})

const steps = [
  { title: 'Applicant Details', icon: UserRound },
  { title: 'PhD Details', icon: GraduationCap },
  { title: 'Research Profile', icon: FileText },
  { title: 'Review & Submit', icon: CheckCircle2 },
]

export default function ApplyPage() {
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(null)
  const addToast = useUiStore((s) => s.addToast)
  const {
    register,
    handleSubmit,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      mobile: '',
      phd_completion_year: 2024,
      phd_discipline: '',
      phd_research_title: '',
      scopus_publications: 0,
      state_country: '',
    },
  })

  const values = watch()
  const currentFields = [
    ['first_name', 'last_name', 'email', 'mobile'],
    ['phd_completion_year', 'phd_discipline', 'phd_research_title'],
    ['scopus_publications', 'state_country'],
    [],
  ][step]

  const goNext = async () => {
    const valid = await trigger(currentFields)
    if (valid) setStep((s) => Math.min(s + 1, steps.length - 1))
  }

  const submit = async (formValues) => {
    const fullName = `${formValues.first_name} ${formValues.last_name}`.trim()
    const res = await createApplicant({
      batch_id: 'batch_2024_A',
      personal: {
        full_name: fullName,
        first_name: formValues.first_name,
        last_name: formValues.last_name,
        email: formValues.email,
        phone: formValues.mobile,
        mobile: formValues.mobile,
        state_country: formValues.state_country,
      },
      academic: {
        highest_degree: 'Ph.D.',
        graduation_year: formValues.phd_completion_year,
        specialization: formValues.phd_discipline,
        phd_completion_year: formValues.phd_completion_year,
        phd_discipline: formValues.phd_discipline,
        phd_research_title: formValues.phd_research_title,
        scopus_publications: formValues.scopus_publications,
      },
      research_statement: `PhD Research Title: ${formValues.phd_research_title}. Discipline: ${formValues.phd_discipline}. Scopus Publications: ${formValues.scopus_publications}. Location: ${formValues.state_country}.`,
    })
    setDone(res.data.temp_id)
    addToast({ type: 'success', title: 'Application submitted', message: 'Your demo test link is ready.' })
  }

  if (done) {
    return <section className="mx-auto grid min-h-[calc(100vh-88px)] max-w-4xl place-items-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="card w-full p-7 text-center sm:p-10">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[var(--accent-tint)] text-[var(--accent)]">
          <CheckCircle2 size={30} />
        </span>
        <h1 className="mt-6 text-3xl font-semibold">Application Submitted</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[var(--secondary)]">Your application has been received. In the actual workflow, the test link will be sent after application review. For this demo, you can start the test now.</p>
        <div className="mx-auto mt-6 max-w-md rounded-[2rem] bg-[var(--accent-tint)] p-6">
          <p className="text-sm font-medium text-[var(--secondary)]">Temporary Application ID</p>
          <p className="mt-2 text-3xl font-semibold text-[var(--accent)]">{done}</p>
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/test/test_001" className="btn-primary inline-flex h-12 items-center gap-2 rounded-2xl px-5"><PlayCircle size={18} />Start Test Now</Link>
          <Link to="/admin" className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 font-semibold"><LayoutDashboard size={18} />Open Dashboard</Link>
        </div>
      </div>
    </section>
  }

  return <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
    <div className="mb-8">
      <span className="rounded-full bg-[var(--accent-tint)] px-4 py-2 text-sm font-semibold text-[var(--accent)]">Demo application</span>
      <h1 className="mt-5 text-4xl font-semibold">Call for Applications: Postdoctoral Program in Applied Business Research</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--secondary)]">Complete the required questions for the July 2026 international postdoctoral program. This demo keeps the flow short and routes you directly to the test after submission.</p>
    </div>

    <form onSubmit={handleSubmit(submit)} className="grid gap-6 lg:grid-cols-[280px_1fr]">
      <aside className="card h-fit p-4">
        <div className="space-y-2">
          {steps.map((item, index) => {
            const Icon = item.icon
            const active = index === step
            const complete = index < step
            return <button
              key={item.title}
              type="button"
              className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${active ? 'bg-[var(--accent-tint)] text-[var(--accent)]' : 'text-[var(--secondary)] hover:bg-[var(--surface)]'}`}
              onClick={async () => {
                if (index <= step) setStep(index)
                else if (await trigger(currentFields)) setStep(index)
              }}
            >
              <span className={`grid h-9 w-9 place-items-center rounded-xl ${active || complete ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface)]'}`}><Icon size={17} /></span>
              {item.title}
            </button>
          })}
        </div>
      </aside>

      <div className="card p-6 sm:p-8">
        <div className="mb-8 h-2 rounded-full bg-[var(--surface)]">
          <div className="h-2 rounded-full bg-[var(--accent)] transition-all duration-300" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>

        {step === 0 && <div>
          <h2 className="text-2xl font-semibold">Applicant Details</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="First Name" required error={errors.first_name?.message}><input className="input w-full" {...register('first_name')} /></Field>
            <Field label="Last Name" required error={errors.last_name?.message}><input className="input w-full" {...register('last_name')} /></Field>
            <Field label="Email" error={errors.email?.message}><input className="input w-full" type="email" {...register('email')} /></Field>
            <Field label="Mobile" required error={errors.mobile?.message}><input className="input w-full" {...register('mobile')} /></Field>
          </div>
        </div>}

        {step === 1 && <div>
          <h2 className="text-2xl font-semibold">PhD Details</h2>
          <div className="mt-6 grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Year of PhD Completion" required error={errors.phd_completion_year?.message}><input className="input w-full" type="number" {...register('phd_completion_year')} /></Field>
              <Field label="Discipline/Field of PhD Study" required error={errors.phd_discipline?.message}><input className="input w-full" {...register('phd_discipline')} /></Field>
            </div>
            <Field label="Title of PhD Research" required error={errors.phd_research_title?.message}><input className="input w-full" {...register('phd_research_title')} /></Field>
          </div>
        </div>}

        {step === 2 && <div>
          <h2 className="text-2xl font-semibold">Research Profile</h2>
          <p className="mt-2 text-sm text-[var(--secondary)]">These fields help the selection committee understand your publication strength and location.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label="Total Number of Scopus Publications" required error={errors.scopus_publications?.message}><input className="input w-full" type="number" min="0" {...register('scopus_publications')} /></Field>
            <Field label="Your State and Country" required error={errors.state_country?.message}><input className="input w-full" {...register('state_country')} /></Field>
          </div>
        </div>}

        {step === 3 && <div>
          <h2 className="text-2xl font-semibold">Review & Submit</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ['First Name', values.first_name],
              ['Last Name', values.last_name],
              ['Email', values.email],
              ['Mobile', values.mobile],
              ['Year of PhD Completion', values.phd_completion_year],
              ['Discipline/Field of PhD Study', values.phd_discipline],
              ['Title of PhD Research', values.phd_research_title],
              ['Total Number of Scopus Publications', values.scopus_publications],
              ['Your State and Country', values.state_country],
            ].map(([label, value]) => <div key={label} className="rounded-2xl bg-[var(--surface)] p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{label}</p>
              <p className="mt-1 font-semibold">{value || '-'}</p>
            </div>)}
          </div>
        </div>}

        <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-[var(--border)] pt-6">
          <button type="button" className="rounded-2xl bg-[var(--surface)] px-5 py-3 font-semibold disabled:opacity-40" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>Back</button>
          {step < steps.length - 1
            ? <button type="button" className="btn-primary inline-flex items-center gap-2" onClick={goNext}>Continue <ArrowRight size={17} /></button>
            : <button className="btn-primary" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit Application'}</button>}
        </div>
      </div>
    </form>
  </section>
}

function Field({ label, required, error, children }) {
  return <label className="block">
    <span className="text-sm font-semibold">{label}{required && <span className="ml-1 text-red-500">*</span>}</span>
    <span className="mt-2 block">{children}</span>
    {error && <span className="mt-2 block text-xs font-medium text-red-500">{error}</span>}
  </label>
}
