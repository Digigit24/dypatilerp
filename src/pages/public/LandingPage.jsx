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

  return <div className="overflow-hidden">
    <section className="relative mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-14 lg:grid-cols-[1.05fr_.95fr] lg:px-8 lg:py-20">
      <div className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(circle_at_20%_0%,var(--accent-tint),transparent_32rem),linear-gradient(180deg,var(--card),transparent)]" />
      <div className="flex flex-col justify-center">
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

      <div className="soft-panel rounded-[2rem] p-5 sm:p-7">
        <div className="rounded-[1.5rem] bg-[var(--card)] p-5 shadow-sm">
          <div className="flex items-center gap-4">
            <img src="/logo-new.jpg" alt="DYPERF" className="h-16 w-auto rounded-2xl object-contain" />
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-[var(--accent-tint)] p-5">
              <CalendarDays className="text-[var(--accent)]" size={24} />
              <p className="mt-5 text-sm text-[var(--secondary)]">Last date to apply</p>
              <p className="mt-1 text-2xl font-semibold">30 June 2026</p>
            </div>
            <div className="rounded-3xl bg-[var(--surface)] p-5">
              <IndianRupee className="text-[var(--accent)]" size={24} />
              <p className="mt-5 text-sm text-[var(--secondary)]">Program fee</p>
              <p className="mt-1 text-2xl font-semibold">₹{totalInr.toLocaleString('en-IN')}</p>
            </div>
            <div className="rounded-3xl bg-[var(--surface)] p-5">
              <UsersRound className="text-[var(--accent)]" size={24} />
              <p className="mt-5 text-sm text-[var(--secondary)]">Mentorship model</p>
              <p className="mt-1 text-lg font-semibold">Academic + Industry</p>
            </div>
            <div className="rounded-3xl bg-[var(--surface)] p-5">
              <GraduationCap className="text-[var(--accent)]" size={24} />
              <p className="mt-5 text-sm text-[var(--secondary)]">Eligibility</p>
              <p className="mt-1 text-lg font-semibold">Ph.D. qualified</p>
            </div>
          </div>
        </div>
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
                  <td className="py-4 font-semibold">₹{row[2]}</td>
                </tr>)}
                <tr className="bg-[var(--accent-tint)]">
                  <td className="rounded-l-2xl py-4 pr-4 font-semibold">Total</td>
                  <td className="py-4 pr-4 font-semibold">2,900</td>
                  <td className="rounded-r-2xl py-4 font-semibold">₹2,75,500</td>
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
          <p className="mt-2 text-sm text-[var(--secondary)]">Contact: programs@dyperf.com · +91 8983942995</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/apply" className="btn-primary inline-flex h-12 items-center gap-2 rounded-2xl px-5">Apply Now <ArrowRight size={18} /></Link>
          <Link to="/test/test_001" className="inline-flex h-12 items-center rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 font-semibold">Start Test Now</Link>
        </div>
      </div>
    </section>
  </div>
}
