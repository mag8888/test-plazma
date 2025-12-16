import { Router, Application } from 'express';
import AdminJS from 'adminjs';
import AdminJSExpress from '@adminjs/express';
import { createRequire } from 'module';
import type { ActionRequest } from 'adminjs';
import { env } from '../config/env.js';
import { prisma } from '../lib/prisma.js';

// Nuclear option: Use require() to bypass ESM named export issues
const require = createRequire(import.meta.url);
const { Database, Resource, getModelByName } = require('@adminjs/prisma');

AdminJS.registerAdapter({ Database, Resource });

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9а-яё\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function setupAdminPanel(app: Application) {
  const admin = new AdminJS({
    rootPath: '/admin',
    branding: {
      companyName: 'Plazma Water MM',
    },
    resources: [
      {
        resource: { model: getModelByName('Category'), client: prisma },
        options: {
          properties: {
            slug: {
              isVisible: {
                list: true,
                edit: false,
                show: true,
                filter: true,
              },
            },
          },
          actions: {
            new: {
              before: async (request: ActionRequest) => {
                const payload = request.payload ?? {};
                if (payload.name && !payload.slug) {
                  return {
                    ...request,
                    payload: {
                      ...payload,
                      slug: slugify(String(payload.name)),
                    },
                  };
                }
                return request;
              },
            },
            edit: {
              before: async (request: ActionRequest) => {
                const payload = request.payload ?? {};
                if (payload.name) {
                  return {
                    ...request,
                    payload: {
                      ...payload,
                      slug: slugify(String(payload.name)),
                    },
                  };
                }
                return request;
              },
            },
          },
        },
      },
      {
        resource: { model: getModelByName('Product'), client: prisma },
        options: {
          properties: {
            description: {
              type: 'richtext',
            },
            price: {
              type: 'number',
            },
          },
          listProperties: ['title', 'categoryId', 'price', 'isActive'],
        },
      },
      {
        resource: { model: getModelByName('Review'), client: prisma },
        options: {
          listProperties: ['name', 'isActive', 'isPinned', 'createdAt'],
        },
      },
      {
        resource: { model: getModelByName('PartnerProfile'), client: prisma },
        options: {
          listProperties: ['id', 'userId', 'programType', 'balance', 'bonus'],
        },
      },
      {
        resource: { model: getModelByName('PartnerTransaction'), client: prisma },
        options: {
          listProperties: ['profileId', 'amount', 'type', 'createdAt'],
        },
      },
      {
        resource: { model: getModelByName('User'), client: prisma },
        options: {
          listProperties: ['telegramId', 'firstName', 'username', 'createdAt'],
        },
      },
      {
        resource: { model: getModelByName('UserHistory'), client: prisma },
        options: {
          listProperties: ['userId', 'action', 'createdAt'],
        },
      },
      {
        resource: { model: getModelByName('OrderRequest'), client: prisma },
        options: {
          listProperties: ['id', 'status', 'createdAt'],
        },
      },
    ],
  });

  const router = Router();
  const adminRouter = AdminJSExpress.buildAuthenticatedRouter(
    admin,
    {
      authenticate: async (email, password) => {
        if (email === env.adminEmail && password === env.adminPassword) {
          return { email };
        }
        return null;
      },
      cookiePassword: env.botWebhookSecret ?? env.adminPassword,
    },
    null,
    {
      resave: false,
      saveUninitialized: false,
    },
  );

  router.use(admin.options.rootPath, adminRouter);
  app.use(router);
}
