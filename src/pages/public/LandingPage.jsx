import { Link } from 'react-router-dom'
import { ArrowRight, BadgeCheck, BookOpen, CalendarDays, GraduationCap, IndianRupee, Layers3, UsersRound } from 'lucide-react'

const features = [
  {
    title: 'Dual Mentorship',
    text: 'Scholars work with academic supervision for research rigor and industry mentorship for practical alignment.',
  },
  {
    title: 'Skill Development',
    text: 'Specialized workshops, seminars, and networking with academicians, professionals, and business leaders.',
  },
  {
    title: 'Cutting-Edge Research',
    text: 'High-impact work on emerging business, entrepreneurship, technology, strategy, and leadership themes.',
  },
]

const process = [
  'Complete the online application form',
  'Shortlisting based on submitted applications',
  'Research Aptitude Test for shortlisted candidates',
  'Interview for candidates who clear the test',
]

const criteria = [
  'Research focus aligned with current business research themes',
  'Quality publications in reputed journals or conferences',
  'Interview performance, research aptitude, and academic background',
]

const semesters = [
  ['1', 'Topic identification, literature review, research gaps, proposal submission', 'Workshop 1: Advanced Research & Publication'],
  ['2', 'Extended literature review, methodology, hypotheses, data collection', 'Workshop 2: Model/Framework/Theory Building'],
  ['3', 'Final data collection, data analysis, model development', 'Workshop 3: Intellectual Property Rights'],
  ['4', 'Data interpretation, findings, thesis development, viva', 'Workshop 4: Research Ethics & Reporting'],
]

const fees = [
  ['Registration, Test, and Interview', '200', '19,000'],
  ['Tuition Fee', '2,100', '1,99,500'],
  ['Administration Fees', '100', '9,500'],
  ['Coursework (1-4)', '200', '19,000'],
  ['Progress Reports (1-4)', '100', '9,500'],
  ['Thesis Submission & Defence Viva', '200', '19,000'],
]

function Section({ title, icon: Icon, children }) {
  return <section className="card p-6 sm:p-8">
    <div className="mb-5 flex items-center gap-3">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[var(--accent-tint)] text-[var(--accent)]"><Icon size={21} /></span>
      <h2 className="text-xl font-semibold sm:text-2xl">{title}</h2>
    </div>
    {children}
  </section>
}

export default function LandingPage() {
  const totalInr = fees.reduce((sum, fee) => sum + Number(fee[2].replaceAll(',', '')), 0)

  return <div className="public-page overflow-hidden">
    <section className="relative px-4 py-8 sm:px-6 sm:py-12 lg:px-8 lg:py-16">
      <div className="absolute inset-x-0 top-0 -z-10 h-[720px] bg-[linear-gradient(180deg,var(--card),transparent_78%),radial-gradient(circle_at_16%_8%,var(--accent-tint),transparent_30rem)]" />
      <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--card)] shadow-[0_30px_90px_rgba(15,23,42,.10)] lg:grid-cols-[.95fr_1.05fr]">
        <div className="flex flex-col justify-start p-6 pb-14 sm:p-10 sm:pb-14 lg:min-h-[560px] lg:justify-center lg:p-12 lg:pb-12">
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--accent-tint)] px-4 py-2 text-sm font-semibold text-[var(--accent)]">July 2026 Batch</span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-2 text-sm font-medium text-[var(--secondary)]">Two-year applied research fellowship</span>
          </div>
          <h1 className="max-w-4xl text-4xl font-semibold leading-tight tracking-normal sm:text-5xl lg:text-6xl">
            Applied Business Research Fellowship Program for Executives
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--secondary)] sm:text-lg">
            Dr. D. Y. Patil Education and Research Foundation and Dr. D. Y. Patil Institute of Management Studies, India, in collaboration with McCoy College of Business, Texas State University, USA, invite applications for this exclusive post-doctoral program.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/apply" className="btn-primary inline-flex h-12 items-center gap-2 rounded-2xl px-5">Apply Now <ArrowRight size={18} /></Link>
            <Link to="/test/test_001" className="inline-flex h-12 items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 font-semibold">Start Test Now</Link>
            <Link to="/admin" className="inline-flex h-12 items-center rounded-2xl px-5 font-semibold text-[var(--accent)]">Open Demo Dashboard</Link>
          </div>
        </div>

        <div className="relative min-h-[260px] lg:min-h-[560px]">
          <img src="/landing-research.jpg" alt="Researchers collaborating in a modern academic workspace" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,.12),rgba(15,23,42,.28)),linear-gradient(180deg,transparent_45%,rgba(15,23,42,.72))]" />
          <div className="absolute bottom-5 left-5 right-5 hidden rounded-[1.75rem] border border-white/20 bg-white/88 p-5 text-slate-950 shadow-2xl backdrop-blur-xl lg:block lg:bottom-7 lg:left-7 lg:right-7 lg:p-6">
            <div className="flex flex-wrap items-center gap-3">
              <img src="/logo-new.jpg" alt="DYPERF" className="h-12 w-auto rounded-xl object-contain" />
              <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">International collaboration</span>
            </div>
            <p className="mt-5 max-w-xl text-xl font-semibold leading-snug sm:text-2xl">A research environment built for academic rigor, executive insight, and applied business impact.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <HeroStat label="Duration" value="2 Years" />
              <HeroStat label="Mentorship" value="Dual" />
              <HeroStat label="Format" value="Online" />
            </div>
          </div>
        </div>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
      <div className="grid overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--card)] shadow-[0_18px_60px_rgba(15,23,42,.07)] md:grid-cols-4">
        <AtGlance icon={CalendarDays} label="Application Deadline" value="30 June 2026" helper="July 2026 intake" />
        <AtGlance icon={IndianRupee} label="Program Fee" value={`Rs. ${totalInr.toLocaleString('en-IN')}`} helper="Total fellowship fee" />
        <AtGlance icon={UsersRound} label="Mentorship Model" value="Academic + Industry" helper="Supervisor and mentor" />
        <AtGlance icon={GraduationCap} label="Eligibility" value="Ph.D. qualified" helper="Social sciences, management, business" />
      </div>
    </section>

    <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-3 lg:px-8">
      {features.map((feature) => <article key={feature.title} className="card card-hover p-6">
        <BadgeCheck className="text-[var(--accent)]" size={24} />
        <h2 className="mt-5 text-lg font-semibold">{feature.title}</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--secondary)]">{feature.text}</p>
      </article>)}
    </section>

    <section className="mx-auto grid max-w-7xl gap-6 px-4 pb-16 sm:px-6 lg:grid-cols-[.9fr_1.1fr] lg:px-8">
      <div className="space-y-6">
        <Section title="Program Overview" icon={BookOpen}>
          <div className="space-y-4 text-sm leading-7 text-[var(--secondary)]">
            <p>This program is designed for accomplished researchers who want to contribute to applied research at the crossroads of business management and industry application.</p>
            <p>Over two years, scholars explore innovative research in business strategy, entrepreneurship, technology, and leadership while bridging theoretical insights with real-world challenges.</p>
          </div>
        </Section>

        <Section title="Eligibility" icon={GraduationCap}>
          <p className="text-sm leading-7 text-[var(--secondary)]">Ph.D. in Social Sciences, Management, or Business.</p>
        </Section>

        <Section title="Selection Criteria" icon={BadgeCheck}>
          <ul className="space-y-3 text-sm leading-6 text-[var(--secondary)]">
            {criteria.map((item) => <li key={item} className="flex gap-3"><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />{item}</li>)}
          </ul>
        </Section>
      </div>

      <div className="space-y-6">
        <Section title="Application Process" icon={Layers3}>
          <div className="grid gap-3 sm:grid-cols-2">
            {process.map((item, index) => <div key={item} className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <span className="text-sm font-semibold text-[var(--accent)]">Step {index + 1}</span>
              <p className="mt-3 text-sm leading-6 text-[var(--secondary)]">{item}</p>
            </div>)}
          </div>
        </Section>

        <Section title="Course Structure" icon={BookOpen}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="border-b border-[var(--border)] text-[var(--secondary)]">
                <tr>
                  <th className="py-3 pr-4 font-semibold">Sem</th>
                  <th className="py-3 pr-4 font-semibold">Scholar Activity</th>
                  <th className="py-3 font-semibold">Coursework / Workshop</th>
                </tr>
              </thead>
              <tbody>
                {semesters.map((row) => <tr key={row[0]} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-4 pr-4 font-semibold text-[var(--accent)]">{row[0]}</td>
                  <td className="py-4 pr-4 text-[var(--secondary)]">{row[1]}</td>
                  <td className="py-4 text-[var(--secondary)]">{row[2]}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Course Fees" icon={IndianRupee}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b border-[var(--border)] text-[var(--secondary)]">
                <tr>
                  <th className="py-3 pr-4 font-semibold">Particular</th>
                  <th className="py-3 pr-4 font-semibold">USD</th>
                  <th className="py-3 font-semibold">INR</th>
                </tr>
              </thead>
              <tbody>
                {fees.map((row) => <tr key={row[0]} className="border-b border-[var(--border)] last:border-0">
                  <td className="py-4 pr-4 text-[var(--secondary)]">{row[0]}</td>
                  <td className="py-4 pr-4 font-semibold">{row[1]}</td>
                  <td className="py-4 font-semibold">Rs. {row[2]}</td>
                </tr>)}
                <tr className="bg-[var(--accent-tint)]">
                  <td className="rounded-l-2xl py-4 pr-4 font-semibold">Total</td>
                  <td className="py-4 pr-4 font-semibold">2,900</td>
                  <td className="rounded-r-2xl py-4 font-semibold">Rs. 2,75,500</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>
      </div>
    </section>

    <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
      <div className="card grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <h2 className="text-2xl font-semibold">Ready to begin your application?</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--secondary)]">The Post-Doctoral Research Center, Dr. D. Y. Patil Education and Research Foundation, Dr. D. Y. Patil Institute of Management Studies, Dr. D. Y. Patil Group, Pune.</p>
          <p className="mt-2 text-sm text-[var(--secondary)]">Contact: programs@dyperf.com - +91 8983942995</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/apply" className="btn-primary inline-flex h-12 items-center gap-2 rounded-2xl px-5">Apply Now <ArrowRight size={18} /></Link>
          <Link to="/test/test_001" className="inline-flex h-12 items-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 font-semibold">Start Test Now</Link>
        </div>
      </div>
    </section>
  </div>
}

function HeroStat({ label, value }) {
  return <div className="rounded-2xl bg-white/70 p-3">
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
    <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
  </div>
}

function AtGlance({ icon: Icon, label, value, helper }) {
  return <div className="border-b border-[var(--border)] p-5 last:border-b-0 sm:p-6 md:border-b-0 md:border-r md:last:border-r-0">
    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--accent-tint)] text-[var(--accent)]">
      <Icon size={21} />
    </div>
    <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">{label}</p>
    <p className="mt-2 text-xl font-semibold text-[var(--text)]">{value}</p>
    <p className="mt-1 text-sm leading-5 text-[var(--secondary)]">{helper}</p>
  </div>
}
