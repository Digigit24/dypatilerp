/**
 * Comprehensive development seed — populates ALL tables with realistic data.
 * Safe to run multiple times (uses ON CONFLICT DO NOTHING / DO UPDATE).
 * Run with: node src/db/dev-seed.js
 *
 * All user passwords: Pass@1234
 */
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { query, pool } from '../config/database.js';
import '../config/env.js';

const PASS_HASH = await bcrypt.hash('Pass@1234', 12);

// ─── helpers ────────────────────────────────────────────────────────────────

const upsertUser = async (email, first, last, phone = null) => {
  const { rows } = await query(
    `INSERT INTO users (email, password_hash, first_name, last_name, phone, is_active, email_verified)
     VALUES ($1,$2,$3,$4,$5,true,true)
     ON CONFLICT (email) DO UPDATE SET first_name=EXCLUDED.first_name, last_name=EXCLUDED.last_name
     RETURNING id`,
    [email, PASS_HASH, first, last, phone]
  );
  return rows[0].id;
};

const getRoleId = async (name) => {
  const { rows } = await query('SELECT id FROM roles WHERE name=$1', [name]);
  return rows[0]?.id;
};

const assignRole = async (userId, roleName, courseId = null, batchId = null, assignedBy = null) => {
  const roleId = await getRoleId(roleName);
  if (!roleId) return;
  await query(
    `INSERT INTO user_roles (user_id,role_id,course_id,batch_id,assigned_by)
     VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
    [userId, roleId, courseId, batchId, assignedBy]
  );
};

// ─── main seed ──────────────────────────────────────────────────────────────

const seed = async () => {
  console.log('🌱  Starting comprehensive dev seed…\n');

  // ── 1. fetch existing admin ──────────────────────────────────────────────
  const { rows: [adminRow] } = await query(`SELECT id FROM users WHERE email='admin@dypatil.edu'`);
  const adminId = adminRow?.id || await upsertUser('admin@dypatil.edu', 'Super', 'Admin');
  console.log('✓  Admin user ready');

  // ── 2. create staff users ────────────────────────────────────────────────
  const coordId    = await upsertUser('coordinator@dypatil.edu',  'Priya',   'Sharma',  '+91 98765 43210');
  const guide1Id   = await upsertUser('anil.kumar@dypatil.edu',   'Anil',    'Kumar',   '+91 91234 56789');
  const guide2Id   = await upsertUser('sunita.rao@dypatil.edu',   'Sunita',  'Rao',     '+91 93456 78901');
  const mentor1Id  = await upsertUser('vikas.mehta@dypatil.edu',  'Vikas',   'Mehta',   '+91 99887 65432');
  const mentor2Id  = await upsertUser('kavita.singh@dypatil.edu', 'Kavita',  'Singh',   '+91 90011 22334');
  console.log('✓  Staff users created');

  // ── 3. create student users ──────────────────────────────────────────────
  const stuIds = [];
  const students = [
    ['rahul.verma@student.dypatil.edu',    'Rahul',    'Verma'],
    ['ananya.das@student.dypatil.edu',     'Ananya',   'Das'],
    ['deepak.nair@student.dypatil.edu',    'Deepak',   'Nair'],
    ['pooja.iyer@student.dypatil.edu',     'Pooja',    'Iyer'],
    ['siddharth.jha@student.dypatil.edu',  'Siddharth','Jha'],
    ['meera.pillai@student.dypatil.edu',   'Meera',    'Pillai'],
    ['arjun.gupta@student.dypatil.edu',    'Arjun',    'Gupta'],
    ['ritu.mishra@student.dypatil.edu',    'Ritu',     'Mishra'],
  ];
  for (const [email, first, last] of students) {
    stuIds.push(await upsertUser(email, first, last));
  }
  console.log('✓  Student users created');

  // ── 4. create applicant users ────────────────────────────────────────────
  const appUserIds = [];
  const appUsers = [
    ['app1@applicant.edu', 'Kiran',   'Desai'],
    ['app2@applicant.edu', 'Nidhi',   'Saxena'],
    ['app3@applicant.edu', 'Mahesh',  'Pandey'],
    ['app4@applicant.edu', 'Leela',   'Krishnan'],
  ];
  for (const [email, first, last] of appUsers) {
    appUserIds.push(await upsertUser(email, first, last));
  }
  console.log('✓  Applicant users created');

  // ── 5. assign global roles ───────────────────────────────────────────────
  await assignRole(coordId,   'coordinator', null, null, adminId);
  await assignRole(guide1Id,  'academic_guide', null, null, adminId);
  await assignRole(guide2Id,  'academic_guide', null, null, adminId);
  await assignRole(mentor1Id, 'industry_mentor', null, null, adminId);
  await assignRole(mentor2Id, 'industry_mentor', null, null, adminId);
  for (const id of stuIds) await assignRole(id, 'student', null, null, adminId);
  for (const id of appUserIds) await assignRole(id, 'applicant', null, null, adminId);
  console.log('✓  Global roles assigned');

  // ── 6. upsert courses ────────────────────────────────────────────────────
  const defaultPrefs = JSON.stringify({
    modules: {
      applicants: true, students: true, batches: true, progress: true,
      approvals: true, fees: true, 'test-builder': true, notifications: true,
      users: true, settings: true, courses: true, roles: true,
    },
  });

  // Update existing ABRF-2024 to add preferences
  const { rows: [abrf] } = await query(
    `INSERT INTO courses (name,code,description,duration_months,max_students_per_batch,fee_structure,is_active,preferences,created_by)
     VALUES ($1,$2,$3,24,30,$4,true,$5,$6)
     ON CONFLICT (code) DO UPDATE
       SET preferences = COALESCE(EXCLUDED.preferences, courses.preferences),
           name = EXCLUDED.name
     RETURNING id`,
    [
      'Applied Business Research Fellowship', 'ABRF-2024',
      'A two-year post-doctoral research program focused on applied business research.',
      JSON.stringify({ "1":50000,"2":50000,"3":50000,"4":50000 }),
      defaultPrefs, adminId,
    ]
  );
  const abrfId = abrf.id;

  const { rows: [dmbr] } = await query(
    `INSERT INTO courses (name,code,description,duration_months,max_students_per_batch,fee_structure,is_active,preferences,created_by)
     VALUES ($1,$2,$3,18,25,$4,true,$5,$6)
     ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name
     RETURNING id`,
    [
      'Digital Marketing & Business Research', 'DMBR-2024',
      'An 18-month program blending digital marketing strategies with business research methodologies.',
      JSON.stringify({ "1":40000,"2":40000,"3":40000 }),
      JSON.stringify({ modules: { applicants:true, students:true, batches:true, progress:true, approvals:true, fees:true, 'test-builder':false, notifications:true, users:false, settings:true, courses:false, roles:false } }),
      adminId,
    ]
  );
  const dmbrId = dmbr.id;

  const { rows: [fmrp] } = await query(
    `INSERT INTO courses (name,code,description,duration_months,max_students_per_batch,fee_structure,is_active,preferences,created_by)
     VALUES ($1,$2,$3,24,20,$4,true,$5,$6)
     ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name
     RETURNING id`,
    [
      'Financial Management Research Program', 'FMRP-2024',
      'A rigorous two-year program for finance professionals seeking advanced research credentials.',
      JSON.stringify({ "1":60000,"2":60000,"3":60000,"4":60000 }),
      defaultPrefs, adminId,
    ]
  );
  const fmrpId = fmrp.id;
  console.log('✓  Courses ready (ABRF, DMBR, FMRP)');

  // ── 7. assign course-scoped roles ────────────────────────────────────────
  await assignRole(coordId,   'coordinator',    abrfId, null, adminId);
  await assignRole(guide1Id,  'academic_guide', abrfId, null, adminId);
  await assignRole(guide2Id,  'academic_guide', dmbrId, null, adminId);
  await assignRole(mentor1Id, 'industry_mentor',abrfId, null, adminId);
  await assignRole(mentor2Id, 'industry_mentor',dmbrId, null, adminId);
  console.log('✓  Course-scoped roles assigned');

  // ── 8. create batches ────────────────────────────────────────────────────
  const upsertBatch = async (courseId, name, code, status, start, end, maxS, desc, createdBy) => {
    const { rows } = await query(
      `INSERT INTO batches (course_id,name,code,status,start_date,end_date,max_students,description,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, status=EXCLUDED.status
       RETURNING id`,
      [courseId, name, code, status, start, end, maxS, desc, createdBy]
    );
    return rows[0].id;
  };

  const abrfBatchAId = await upsertBatch(abrfId,'Batch A – 2024','ABRF-2024-A','active','2024-01-15','2025-12-31',30,'First cohort of the ABRF program 2024.',adminId);
  const abrfBatchBId = await upsertBatch(abrfId,'Batch B – 2025','ABRF-2025-B','upcoming','2025-01-15','2026-12-31',30,'Second cohort of the ABRF program 2025.',adminId);
  const dmbrBatchAId = await upsertBatch(dmbrId,'Batch A – 2024','DMBR-2024-A','active','2024-03-01','2025-08-31',25,'Inaugural batch for DMBR program.',adminId);
  const fmrpBatchAId = await upsertBatch(fmrpId,'Batch A – 2025','FMRP-2025-A','upcoming','2025-04-01','2027-03-31',20,'First cohort of FMRP.',adminId);
  console.log(`✓  Batches ready (IDs available)`);

  // ── 9. enroll students ───────────────────────────────────────────────────
  // ABRF Batch A: students 0-5  |  DMBR Batch A: students 6-7
  const enrollData = [
    [stuIds[0], abrfBatchAId, 'DYP-ABRF-2024-001', null, 2],
    [stuIds[1], abrfBatchAId, 'DYP-ABRF-2024-002', null, 2],
    [stuIds[2], abrfBatchAId, 'DYP-ABRF-2024-003', null, 1],
    [stuIds[3], abrfBatchAId, 'DYP-ABRF-2024-004', null, 1],
    [stuIds[4], abrfBatchAId, 'DYP-ABRF-2024-005', null, 3],
    [stuIds[5], abrfBatchAId, 'DYP-ABRF-2024-006', null, 2],
    [stuIds[6], dmbrBatchAId, 'DYP-DMBR-2024-001', null, 1],
    [stuIds[7], dmbrBatchAId, 'DYP-DMBR-2024-002', null, 1],
  ];
  const enrollIds = [];
  for (const [userId, batchId, enrollNum, appId, sem] of enrollData) {
    const { rows } = await query(
      `INSERT INTO batch_enrollments (batch_id,user_id,applicant_id,enrollment_number,status,current_semester,enrolled_by)
       VALUES ($1,$2,$3,$4,'active',$5,$6)
       ON CONFLICT (batch_id,user_id) DO UPDATE SET enrollment_number=EXCLUDED.enrollment_number
       RETURNING id`,
      [batchId, userId, appId, enrollNum, sem, adminId]
    );
    enrollIds.push(rows[0].id);
  }
  console.log('✓  Students enrolled in batches');

  // ── 10. applicants ───────────────────────────────────────────────────────
  const phd = (uni, yr, subj, title) => JSON.stringify({ university: uni, year_awarded: yr, subject: subj, thesis_title: title });
  const appData = [
    [appUserIds[0], abrfId, abrfBatchAId, 'Kiran',  'Desai',   'kiran.desai@email.com',   '+91 98001 11111', 'submitted',    phd('Mumbai University',2020,'Management','Role of AI in Supply Chain')],
    [appUserIds[1], abrfId, abrfBatchAId, 'Nidhi',  'Saxena',  'nidhi.saxena@email.com',  '+91 98002 22222', 'test_pending', phd('Delhi University',2019,'Finance','ESG Reporting & Firm Value')],
    [appUserIds[2], dmbrId, dmbrBatchAId, 'Mahesh', 'Pandey',  'mahesh.pandey@email.com', '+91 98003 33333', 'shortlisted',  phd('Pune University',2021,'Marketing','Digital Disruption in Retail Banking')],
    [appUserIds[3], abrfId, null,         'Leela',  'Krishnan','leela.k@email.com',        '+91 98004 44444', 'submitted',    phd('IIT Bombay',2022,'Operations','Lean Manufacturing in MSME')],
  ];
  for (const [userId, courseId, batchId, fn, ln, email, phone, status, phdJ] of appData) {
    await query(
      `INSERT INTO applicants (user_id,course_id,batch_id,first_name,last_name,email,phone,status,phd_details)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
       ON CONFLICT DO NOTHING`,
      [userId, courseId, batchId, fn, ln, email, phone, status, phdJ]
    );
  }
  console.log('✓  Applicants seeded');

  // ── 11. student guides ───────────────────────────────────────────────────
  const guideAssignments = [
    [stuIds[0], guide1Id,  abrfBatchAId, 'academic'],
    [stuIds[0], mentor1Id, abrfBatchAId, 'industry'],
    [stuIds[1], guide1Id,  abrfBatchAId, 'academic'],
    [stuIds[1], mentor1Id, abrfBatchAId, 'industry'],
    [stuIds[2], guide2Id,  abrfBatchAId, 'academic'],
    [stuIds[2], mentor2Id, abrfBatchAId, 'industry'],
    [stuIds[3], guide1Id,  abrfBatchAId, 'academic'],
    [stuIds[4], guide2Id,  abrfBatchAId, 'academic'],
    [stuIds[4], mentor1Id, abrfBatchAId, 'industry'],
    [stuIds[5], guide2Id,  abrfBatchAId, 'academic'],
    [stuIds[6], guide2Id,  dmbrBatchAId, 'academic'],
    [stuIds[7], guide2Id,  dmbrBatchAId, 'academic'],
  ];
  for (const [stuId, guideId, batchId, type] of guideAssignments) {
    await query(
      `INSERT INTO student_guides (student_user_id,guide_user_id,batch_id,guide_type,assigned_by)
       VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,
      [stuId, guideId, batchId, type, adminId]
    );
  }
  console.log('✓  Student guides assigned');

  // ── 12. submissions ──────────────────────────────────────────────────────
  const submissionTypes = ['research_paper', 'progress_report', 'thesis_chapter'];
  const subStatuses = ['approved', 'under_review', 'approved', 'needs_revision', 'submitted', 'draft'];
  const subIds = [];
  const now = new Date();

  for (let si = 0; si < 6; si++) {
    const stuId = stuIds[si];
    const sem = enrollData[si][4]; // current_semester
    for (let j = 0; j < 3; j++) {
      const status = subStatuses[(si + j) % subStatuses.length];
      const isSubmitted = ['approved','under_review','needs_revision','submitted'].includes(status);
      const title = [
        `Impact of Digital Transformation on ${['SMEs','MSME Sector','Financial Services','Healthcare','Retail','Manufacturing'][si]}`,
        `Quarterly Progress Report – Semester ${sem}`,
        `Chapter ${j+1}: Literature Review`,
      ][j];
      const { rows } = await query(
        `INSERT INTO submissions (batch_id,student_user_id,title,submission_type,semester,status,content,submitted_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING id`,
        [
          abrfBatchAId, stuId, title, submissionTypes[j], sem, status,
          `This is a sample submission for ${title}. Detailed research content goes here.`,
          isSubmitted ? new Date(now.getTime() - Math.random() * 30 * 86400000) : null,
        ]
      );
      subIds.push({ id: rows[0].id, status, stuId });
    }
  }
  console.log(`✓  ${subIds.length} submissions created`);

  // ── 13. approvals ────────────────────────────────────────────────────────
  const stages = ['coordinator', 'academic_guide', 'industry_mentor'];
  for (const { id: subId, status } of subIds) {
    if (!['approved','under_review','needs_revision','submitted'].includes(status)) continue;
    const numStages = status === 'approved' ? 3 : status === 'under_review' ? 2 : 1;
    for (let i = 0; i < numStages; i++) {
      const reviewerId = [coordId, guide1Id, mentor1Id][i];
      const aStatus = i < numStages - 1 ? 'approved' : (status === 'approved' ? 'approved' : status === 'needs_revision' ? 'needs_revision' : 'pending');
      await query(
        `INSERT INTO approvals (submission_id,stage,status,reviewer_user_id,order_index,action_at,comments)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
        [
          subId, stages[i], aStatus, aStatus !== 'pending' ? reviewerId : null, i+1,
          aStatus !== 'pending' ? new Date(now.getTime() - Math.random() * 20 * 86400000) : null,
          aStatus === 'approved' ? 'Approved — meets all requirements.' :
          aStatus === 'needs_revision' ? 'Please revise the literature review section.' : null,
        ]
      );
    }
  }
  console.log('✓  Approvals seeded');

  // ── 14. fees ─────────────────────────────────────────────────────────────
  const feeStatuses = ['paid', 'paid', 'pending', 'overdue', 'pending', 'paid', 'paid', 'pending'];
  const feeAmounts = [50000, 50000, 50000, 50000, 50000, 50000, 50000, 50000];
  const feeIds = [];
  for (let si = 0; si < 6; si++) {
    for (let sem = 1; sem <= 2; sem++) {
      const status = feeStatuses[(si + sem - 1) % feeStatuses.length];
      const dueDate = new Date(2024, (si * 2 + sem - 1) % 12, 1).toISOString().split('T')[0];
      const { rows } = await query(
        `INSERT INTO fees (batch_id,student_user_id,semester,amount,due_date,status,description)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [abrfBatchAId, stuIds[si], sem, feeAmounts[si], dueDate, status, `Semester ${sem} tuition fee`]
      );
      feeIds.push({ id: rows[0].id, status, stuId: stuIds[si] });
    }
  }
  // fee_payments for paid fees
  for (const { id: feeId, status } of feeIds) {
    if (status !== 'paid') continue;
    await query(
      `INSERT INTO fee_payments (fee_id,amount,payment_method,transaction_id,recorded_by)
       VALUES ($1,50000,'bank_transfer',$2,$3) ON CONFLICT DO NOTHING`,
      [feeId, `TXN-DYP-${Math.floor(Math.random()*9000000+1000000)}`, adminId]
    );
  }
  console.log('✓  Fees and payments seeded');

  // ── 15. progress reports ─────────────────────────────────────────────────
  const modules = ['Research Methodology','Literature Review','Data Collection','Analysis & Results','Thesis Writing'];
  const progStatuses = ['completed','in_progress','not_started'];
  for (let si = 0; si < 6; si++) {
    const sem = enrollData[si][4];
    for (let mi = 0; mi < 3; mi++) {
      const ps = progStatuses[(si + mi) % progStatuses.length];
      const pct = ps === 'completed' ? 100 : ps === 'in_progress' ? Math.floor(30 + Math.random() * 50) : 0;
      await query(
        `INSERT INTO progress_reports (batch_id,student_user_id,semester,module_name,status,completion_percentage,due_date)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`,
        [
          abrfBatchAId, stuIds[si], sem, modules[mi], ps, pct,
          new Date(2025, (mi * 3 + si) % 12, 28).toISOString().split('T')[0],
        ]
      );
    }
  }
  console.log('✓  Progress reports seeded');

  // ── 16. research profiles + publications ─────────────────────────────────
  const profileData = [
    [stuIds[0], 'rahul-verma-dypatil', 'Researcher focused on AI applications in supply chain management.', ['Artificial Intelligence','Supply Chain','Operations Research']],
    [stuIds[1], 'ananya-das-dypatil',  'Finance researcher exploring ESG frameworks and firm performance.', ['ESG','Finance','Sustainability']],
    [stuIds[2], 'deepak-nair-dypatil', 'Marketing researcher studying digital disruption in banking.', ['Digital Marketing','FinTech','Consumer Behavior']],
    [guide1Id,  'anil-kumar-dypatil',  'Professor with 15+ years in operations management research.', ['Operations','Lean Manufacturing','Quality Management']],
    [guide2Id,  'sunita-rao-dypatil',  'Associate professor specializing in marketing analytics.', ['Marketing Analytics','Consumer Research','Brand Management']],
  ];
  for (const [userId, slug, bio, interests] of profileData) {
    await query(
      `INSERT INTO research_profiles (user_id,slug,bio,research_interests,is_public,current_institution,designation)
       VALUES ($1,$2,$3,$4::jsonb,true,'DY Patil Vidyapeeth','Researcher')
       ON CONFLICT (user_id) DO UPDATE SET bio=EXCLUDED.bio, research_interests=EXCLUDED.research_interests`,
      [userId, slug, bio, JSON.stringify(interests)]
    );
    // Add 2 publications per profile
    for (let pi = 0; pi < 2; pi++) {
      await query(
        `INSERT INTO publications (user_id,title,authors,journal,year,doi,publication_type)
         VALUES ($1,$2,$3::jsonb,$4,$5,$6,'journal') ON CONFLICT DO NOTHING`,
        [
          userId,
          `Research Paper ${pi+1} by ${slug.split('-')[0]}`,
          JSON.stringify([`${slug.split('-')[0].charAt(0).toUpperCase()+slug.split('-')[0].slice(1)} ${slug.split('-')[1].charAt(0).toUpperCase()+slug.split('-')[1].slice(1)}`, 'Co-Author A']),
          `Journal of ${interests[0]} Research`,
          2022 + pi,
          `10.1000/test.${Math.floor(Math.random()*90000+10000)}`,
        ]
      );
    }
  }
  console.log('✓  Research profiles and publications seeded');

  // ── 17. tests ────────────────────────────────────────────────────────────
  const { rows: [entranceTest] } = await query(
    `INSERT INTO tests (course_id,title,description,type,duration_minutes,total_marks,passing_marks,status,created_by)
     VALUES ($1,'ABRF Entrance Examination 2024','Entrance test for ABRF Fellowship 2024 batch applicants.','entrance',90,100,60,'published',$2)
     ON CONFLICT DO NOTHING RETURNING id`,
    [abrfId, adminId]
  );
  if (entranceTest) {
    const questions = [
      ['mcq','What is the primary goal of applied business research?',5,JSON.stringify({options:['Pure knowledge','Solving practical problems','Academic publishing','Data collection'],correct_answer:'Solving practical problems'})],
      ['mcq','Which research methodology focuses on statistical analysis?',5,JSON.stringify({options:['Qualitative','Quantitative','Ethnographic','Narrative'],correct_answer:'Quantitative'})],
      ['short_answer','Briefly explain the concept of triangulation in research.',10,JSON.stringify({word_limit:150})],
      ['mcq','What is a literature review?',5,JSON.stringify({options:['Primary data collection','Summary of existing research','Statistical analysis','Field study'],correct_answer:'Summary of existing research'})],
      ['long_answer','Describe a research problem from your PhD that you would like to extend.',20,JSON.stringify({word_limit:400})],
    ];
    for (let qi = 0; qi < questions.length; qi++) {
      const [type, text, marks, config] = questions[qi];
      await query(
        `INSERT INTO test_questions (test_id,question_type,question_text,marks,order_index,config)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb) ON CONFLICT DO NOTHING`,
        [entranceTest.id, type, text, marks, qi+1, config]
      );
    }
  }
  console.log('✓  Test and questions seeded');

  // ── 18. notifications ────────────────────────────────────────────────────
  const notifData = [
    [abrfId, abrfBatchAId, 'announcement', 'Welcome to ABRF 2024!', 'The Applied Business Research Fellowship 2024 cohort is now officially started. Please log in to review your portal.',coordId],
    [abrfId, abrfBatchAId, 'report_due',   'Progress Report Due',   'Semester 2 progress reports are due in 14 days. Please complete your modules.',coordId],
    [abrfId, null,         'zoom_link',    'Monthly Webinar',        'Join us for the monthly research guidance webinar. Link: https://zoom.us/j/example',coordId],
    [abrfId, abrfBatchAId, 'fee_due',      'Fee Reminder',           'Semester 2 fees are now due. Please complete payment to avoid late charges.',adminId],
    [dmbrId, dmbrBatchAId, 'announcement', 'Welcome to DMBR 2024',   'Welcome to the Digital Marketing & Business Research program. Your journey begins!',coordId],
  ];
  for (const [courseId, batchId, type, title, message, createdBy] of notifData) {
    const { rows: [notif] } = await query(
      `INSERT INTO notifications (course_id,batch_id,type,title,message,created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [courseId, batchId, type, title, message, createdBy]
    );
    // send to all enrolled students in the batch or course
    const recipients = batchId ? stuIds.slice(0, 6) : [...stuIds.slice(0,6), guide1Id, guide2Id];
    for (const userId of recipients) {
      await query(
        `INSERT INTO notification_recipients (notification_id,user_id,is_read)
         VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [notif.id, userId, Math.random() > 0.5]
      );
    }
  }
  console.log('✓  Notifications seeded');

  // ── done ─────────────────────────────────────────────────────────────────
  console.log('\n✅  Dev seed complete!\n');
  console.log('Credentials (all):');
  console.log('  Admin       admin@dypatil.edu        / Admin@1234');
  console.log('  Coordinator coordinator@dypatil.edu  / Pass@1234');
  console.log('  Guide 1     anil.kumar@dypatil.edu   / Pass@1234');
  console.log('  Mentor 1    vikas.mehta@dypatil.edu  / Pass@1234');
  console.log('  Student 1   rahul.verma@student.dypatil.edu / Pass@1234');
  console.log('\nCourses: ABRF-2024, DMBR-2024, FMRP-2024');
  console.log('Batches: ABRF-2024-A (active), ABRF-2025-B, DMBR-2024-A (active), FMRP-2025-A\n');

  await pool.end();
};

seed().catch((err) => { console.error('Seed failed:', err); process.exit(1); });
