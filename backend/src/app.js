import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env.js';
import { swaggerSpec } from './config/swagger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Routes
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/users.routes.js';
import roleRoutes from './modules/roles/roles.routes.js';
import courseRoutes from './modules/courses/courses.routes.js';
import batchRoutes from './modules/batches/batches.routes.js';
import applicantRoutes from './modules/applicants/applicants.routes.js';
import studentRoutes from './modules/students/students.routes.js';
import testRoutes from './modules/tests/tests.routes.js';
import submissionRoutes from './modules/submissions/submissions.routes.js';
import approvalRoutes from './modules/approvals/approvals.routes.js';
import progressReportRoutes from './modules/progress-reports/progress-reports.routes.js';
import feeRoutes from './modules/fees/fees.routes.js';
import notificationRoutes from './modules/notifications/notifications.routes.js';
import researchProfileRoutes from './modules/research-profiles/research-profiles.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import videoRoutes from './modules/videos/videos.routes.js';
import auditLogRoutes from './modules/audit-logs/audit-logs.routes.js';

const app = express();

// Security
app.use(helmet());
app.use(cors({ origin: [env.FRONTEND_URL, 'https://dyperf.netlify.app'], credentials: true }));

// Rate limiting
app.use(rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Logging
if (env.isDev) app.use(morgan('dev'));

// Body parsing
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check (no auth)
app.get('/health', (req, res) => res.json({ status: 'ok', env: env.NODE_ENV }));

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'DY Patil ERP API',
}));
app.get('/api-docs.json', (req, res) => res.json(swaggerSpec));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/batches', batchRoutes);
app.use('/api/applicants', applicantRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/progress-reports', progressReportRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/research-profiles', researchProfileRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/audit-logs', auditLogRoutes);

// 404 + global error handler
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
