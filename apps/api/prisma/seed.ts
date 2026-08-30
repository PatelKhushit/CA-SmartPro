// Seeds system reference data only: roles + permissions.
//
// Deliberately does NOT seed any organization, user, client, or compliance
// rule data. Organizations/users are created for real through the signup
// flow. Compliance rules must be entered by the firm (or a verified system
// admin) through the Compliance Rules screen — statutory due dates are never
// invented or hardcoded here (see docs/STATUS.md).

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PERMISSIONS: Array<{ key: string; category: string; description: string }> = [
  // Clients
  { key: 'clients.view', category: 'clients', description: 'View client records' },
  { key: 'clients.create', category: 'clients', description: 'Create clients' },
  { key: 'clients.edit', category: 'clients', description: 'Edit client records' },
  { key: 'clients.delete', category: 'clients', description: 'Delete/archive clients' },
  // Tasks
  { key: 'tasks.view', category: 'tasks', description: 'View tasks' },
  { key: 'tasks.create', category: 'tasks', description: 'Create tasks' },
  { key: 'tasks.edit', category: 'tasks', description: 'Edit tasks' },
  { key: 'tasks.assign', category: 'tasks', description: 'Assign tasks to team members' },
  { key: 'tasks.complete', category: 'tasks', description: 'Complete tasks' },
  { key: 'tasks.delete', category: 'tasks', description: 'Delete tasks' },
  { key: 'task_templates.manage', category: 'tasks', description: 'Manage recurring task templates' },
  // Documents
  { key: 'documents.view', category: 'documents', description: 'View client documents' },
  { key: 'documents.upload', category: 'documents', description: 'Upload client documents' },
  { key: 'documents.edit', category: 'documents', description: 'Edit document metadata (title/category)' },
  { key: 'documents.delete', category: 'documents', description: 'Delete client documents' },
  { key: 'document_requests.view', category: 'documents', description: 'View document requests/checklists' },
  {
    key: 'document_requests.manage',
    category: 'documents',
    description: 'Create/edit document requests and fulfill checklist items',
  },
  // Payments (Phase 2 module; permission reserved now)
  { key: 'payments.view', category: 'payments', description: 'View payments/invoices' },
  { key: 'payments.create', category: 'payments', description: 'Create payments/invoices' },
  // Reports
  { key: 'reports.view', category: 'reports', description: 'View and export reports' },
  // AI
  { key: 'ai.use', category: 'ai', description: 'Use the AI Copilot' },
  { key: 'ai.actions', category: 'ai', description: 'Let the AI Copilot/Voice Assistant create tasks and follow-ups' },
  // Compliance & Calendar
  { key: 'compliance.manage', category: 'compliance', description: 'Configure compliance rules' },
  { key: 'calendar.manage', category: 'calendar', description: 'Create/edit calendar events' },
  // Goals
  { key: 'goals.manage', category: 'goals', description: 'Set and edit productivity goals' },
  // Notifications
  { key: 'notifications.manage', category: 'notifications', description: 'Manage own notification preferences' },
  // Notices
  { key: 'notices.view', category: 'notices', description: 'View notices' },
  { key: 'notices.manage', category: 'notices', description: 'Create/edit notices, comments, tasks' },
  // UDIN
  { key: 'udin.view', category: 'udin', description: 'View UDIN records' },
  { key: 'udin.manage', category: 'udin', description: 'Create/edit UDIN records' },
  // GST
  { key: 'gst.view', category: 'gst', description: 'View GST profiles and returns' },
  { key: 'gst.manage', category: 'gst', description: 'Create/edit GST profiles and returns' },
  // TDS
  { key: 'tds.view', category: 'tds', description: 'View TDS profiles, returns, challans, certificates' },
  { key: 'tds.manage', category: 'tds', description: 'Create/edit TDS profiles, returns, challans, certificates' },
  // Automations
  { key: 'automations.view', category: 'automations', description: 'View automation rules and execution history' },
  { key: 'automations.manage', category: 'automations', description: 'Create/edit/enable/pause automation rules' },
  // Org/Team administration
  { key: 'settings.manage', category: 'settings', description: 'Manage firm settings' },
  { key: 'users.manage', category: 'settings', description: 'Invite/manage team members' },
  { key: 'roles.manage', category: 'settings', description: 'Manage roles and permission assignments' },
  { key: 'team.manage', category: 'settings', description: 'View team workload and invite/manage members' },
];

const ROLES: Array<{
  key: string;
  name: string;
  description: string;
  permissions: string[];
}> = [
  {
    key: 'SUPER_ADMIN',
    name: 'Super Admin',
    description: 'Full SaaS administration. Phase 2: cross-organization admin console.',
    permissions: PERMISSIONS.map((p) => p.key),
  },
  {
    key: 'FIRM_ADMIN',
    name: 'Firm Admin / CA',
    description: 'Full firm-level access.',
    permissions: PERMISSIONS.map((p) => p.key),
  },
  {
    key: 'MANAGER',
    name: 'Manager',
    description: 'Team and client management.',
    permissions: [
      'clients.view', 'clients.create', 'clients.edit',
      'tasks.view', 'tasks.create', 'tasks.edit', 'tasks.assign', 'tasks.complete',
      'task_templates.manage',
      'documents.view', 'documents.upload', 'documents.edit', 'documents.delete',
      'document_requests.view', 'document_requests.manage',
      'payments.view',
      'reports.view',
      'ai.use', 'ai.actions',
      'compliance.manage',
      'calendar.manage',
      'goals.manage',
      'notifications.manage',
      'notices.view', 'notices.manage',
      'udin.view', 'udin.manage',
      'gst.view', 'gst.manage',
      'tds.view', 'tds.manage',
      'automations.view', 'automations.manage',
      'team.manage',
    ],
  },
  {
    key: 'ACCOUNTANT',
    name: 'Accountant',
    description: 'Assigned accounting/compliance work.',
    permissions: [
      'clients.view',
      'tasks.view', 'tasks.edit', 'tasks.complete',
      'documents.view', 'documents.upload', 'documents.edit',
      'document_requests.view',
      'reports.view',
      'ai.use', 'ai.actions',
      'calendar.manage',
      'goals.manage',
      'notifications.manage',
      'notices.view', 'notices.manage',
      'udin.view', 'udin.manage',
      'gst.view', 'gst.manage',
      'tds.view', 'tds.manage',
    ],
  },
  {
    key: 'STAFF',
    name: 'Staff',
    description: 'Only permitted/assigned work.',
    permissions: [
      'clients.view',
      'tasks.view', 'tasks.complete',
      'documents.view', 'documents.upload',
      'document_requests.view',
      'ai.use',
      'notifications.manage',
      'notices.view',
      'udin.view',
      'gst.view',
      'tds.view',
    ],
  },
  {
    key: 'CLIENT',
    name: 'Client',
    description: 'Client portal access. Phase 2: client portal not yet built; role reserved.',
    permissions: [],
  },
];

async function main() {
  console.log('Seeding permissions...');
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: { category: perm.category, description: perm.description },
      create: perm,
    });
  }

  console.log('Seeding roles...');
  for (const role of ROLES) {
    const created = await prisma.role.upsert({
      where: { key: role.key },
      update: { name: role.name, description: role.description, isSystem: true },
      create: { key: role.key, name: role.name, description: role.description, isSystem: true },
    });

    const permissionRows = await prisma.permission.findMany({
      where: { key: { in: role.permissions } },
      select: { id: true },
    });

    await prisma.rolePermission.deleteMany({ where: { roleId: created.id } });
    if (permissionRows.length > 0) {
      await prisma.rolePermission.createMany({
        data: permissionRows.map((p) => ({ roleId: created.id, permissionId: p.id })),
        skipDuplicates: true,
      });
    }
  }

  console.log('Seed complete: roles + permissions only (no organizations/clients/compliance rules).');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
