import swaggerJsdoc from 'swagger-jsdoc';
import { env } from './env.js';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'DY Patil ERP API',
      version: '1.0.0',
      description:
        'REST API for the Applied Business Research Fellowship Program ERP system. Supports multi-course, multi-batch management with RBAC.',
      contact: { name: 'DY Patil Dev Team' },
    },
    servers: [
      { url: `http://localhost:${env.PORT}/api`, description: 'Development' },
      { url: 'https://api.dypatilerp.com/api', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            errors: { type: 'array', items: { type: 'object' } },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'array', items: {} },
            pagination: {
              type: 'object',
              properties: {
                total: { type: 'integer' },
                page: { type: 'integer' },
                limit: { type: 'integer' },
                totalPages: { type: 'integer' },
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication & token management' },
      { name: 'Users', description: 'User account management' },
      { name: 'Roles', description: 'RBAC roles & permissions' },
      { name: 'Courses', description: 'Course/program management' },
      { name: 'Batches', description: 'Batch management per course' },
      { name: 'Applicants', description: 'Application pipeline' },
      { name: 'Students', description: 'Enrolled student management' },
      { name: 'Tests', description: 'Test/examination builder & attempts' },
      { name: 'Submissions', description: 'Research submissions' },
      { name: 'Approvals', description: 'Multi-stage approval workflow' },
      { name: 'Progress Reports', description: 'Milestone & progress tracking' },
      { name: 'Fees', description: 'Fee management & payments' },
      { name: 'Notifications', description: 'Notification system' },
      { name: 'Research Profiles', description: 'Academic research profiles' },
      { name: 'Dashboard', description: 'Aggregated dashboards' },
    ],
  },
  apis: ['./src/modules/**/*.routes.js'],
};

export const swaggerSpec = swaggerJsdoc(options);
