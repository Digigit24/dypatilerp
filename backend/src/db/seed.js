import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { query, pool } from '../config/database.js';
import '../config/env.js';

const seed = async () => {
  console.log('Seeding database...');

  // Roles
  const roles = [
    { name: 'admin', display_name: 'Administrator' },
    { name: 'coordinator', display_name: 'Coordinator' },
    { name: 'academic_guide', display_name: 'Academic Guide' },
    { name: 'industry_mentor', display_name: 'Industry Mentor' },
    { name: 'student', display_name: 'Student' },
    { name: 'applicant', display_name: 'Applicant' },
  ];

  const roleIds = {};
  for (const role of roles) {
    const { rows } = await query(
      `INSERT INTO roles (name, display_name)
       VALUES ($1, $2)
       ON CONFLICT (name) DO UPDATE SET display_name = EXCLUDED.display_name
       RETURNING id`,
      [role.name, role.display_name]
    );
    roleIds[role.name] = rows[0].id;
  }

  // Permissions (module × action)
  const modules = [
    'users', 'roles', 'courses', 'batches', 'applicants',
    'students', 'tests', 'submissions', 'approvals',
    'progress_reports', 'fees', 'notifications', 'research_profiles', 'dashboard',
  ];
  const actions = ['create', 'read', 'update', 'delete'];
  const permIds = {};

  for (const module of modules) {
    for (const action of actions) {
      const { rows } = await query(
        `INSERT INTO permissions (module, action)
         VALUES ($1, $2)
         ON CONFLICT (module, action) DO UPDATE SET module = EXCLUDED.module
         RETURNING id`,
        [module, action]
      );
      permIds[`${module}:${action}`] = rows[0].id;
    }
  }

  // Grant all permissions to admin
  for (const permId of Object.values(permIds)) {
    await query(
      `INSERT INTO role_permissions (role_id, permission_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [roleIds['admin'], permId]
    );
  }

  // Grant read-heavy permissions to coordinator
  const coordinatorPerms = [
    'applicants:create', 'applicants:read', 'applicants:update',
    'students:read', 'students:update',
    'batches:read', 'batches:create', 'batches:update',
    'courses:read',
    'submissions:read', 'submissions:update',
    'approvals:read', 'approvals:create', 'approvals:update',
    'fees:read', 'fees:create', 'fees:update',
    'progress_reports:read', 'progress_reports:update',
    'notifications:create', 'notifications:read',
    'research_profiles:read',
    'dashboard:read',
    'tests:create', 'tests:read', 'tests:update',
  ];
  for (const key of coordinatorPerms) {
    await query(
      `INSERT INTO role_permissions (role_id, permission_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [roleIds['coordinator'], permIds[key]]
    );
  }

  // Grant read-heavy permissions to student
  const studentPerms = [
    'fees:read',
    'progress_reports:read',
    'submissions:read', 'submissions:create',
    'approvals:read',
    'research_profiles:read', 'research_profiles:update',
    'notifications:read',
    'dashboard:read',
  ];
  for (const key of studentPerms) {
    await query(
      `INSERT INTO role_permissions (role_id, permission_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [roleIds['student'], permIds[key]]
    );
  }

  // Grant permissions to academic_guide
  const academicGuidePerms = [
    'students:read',
    'submissions:read', 'submissions:update',
    'approvals:read', 'approvals:create', 'approvals:update',
    'progress_reports:read',
    'research_profiles:read',
    'notifications:read', 'notifications:create',
    'dashboard:read',
  ];
  for (const key of academicGuidePerms) {
    await query(
      `INSERT INTO role_permissions (role_id, permission_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [roleIds['academic_guide'], permIds[key]]
    );
  }

  // Grant permissions to industry_mentor
  const industryMentorPerms = [
    'students:read',
    'submissions:read',
    'approvals:read', 'approvals:create', 'approvals:update',
    'progress_reports:read',
    'research_profiles:read',
    'notifications:read',
    'dashboard:read',
  ];
  for (const key of industryMentorPerms) {
    await query(
      `INSERT INTO role_permissions (role_id, permission_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [roleIds['industry_mentor'], permIds[key]]
    );
  }

  // Grant minimal permissions to applicant
  const applicantPerms = [
    'tests:read',
    'submissions:read',
    'notifications:read',
  ];
  for (const key of applicantPerms) {
    await query(
      `INSERT INTO role_permissions (role_id, permission_id)
       VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [roleIds['applicant'], permIds[key]]
    );
  }

  // Seed admin user
  const hash = await bcrypt.hash('Admin@1234', 12);
  const { rows: adminRows } = await query(
    `INSERT INTO users (email, password_hash, first_name, last_name, is_active, email_verified)
     VALUES ('admin@dypatil.edu', $1, 'Super', 'Admin', true, true)
     ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
     RETURNING id`,
    [hash]
  );
  const adminId = adminRows[0].id;

  await query(
    `INSERT INTO user_roles (user_id, role_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [adminId, roleIds['admin']]
  );

  // Seed sample course
  const { rows: courseRows } = await query(
    `INSERT INTO courses (name, code, description, duration_months, max_students_per_batch, fee_structure, created_by)
     VALUES (
       'Applied Business Research Fellowship',
       'ABRF-2024',
       'A two-year post-doctoral research program focused on applied business research.',
       24, 30,
       '{"1":50000,"2":50000,"3":50000,"4":50000}',
       $1
     )
     ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [adminId]
  );

  console.log('Seed complete.');
  console.log('Admin login: admin@dypatil.edu / Admin@1234');
  await pool.end();
};

seed().catch((err) => { console.error(err); process.exit(1); });
