import { PrismaClient, ProjectStatus, TaskStatus, TaskPriority, UserRole, PaymentMethod, PaymentStatus } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Ensure demo tenant exists (seed data always goes into this tenant)
  const demoTenant = await prisma.tenant.upsert({
    where: { slug: 'demo' },
    create: { slug: 'demo', name: 'Demo Tenant', updatedAt: new Date() },
    update: { updatedAt: new Date() },
  });

  // Make seed idempotent: wipe demo tenant data then recreate
  await prisma.expenseAllocation.deleteMany({
    where: { expense: { tenantId: demoTenant.id } },
  });
  await prisma.expense.deleteMany({ where: { tenantId: demoTenant.id } });
  await prisma.timeEntry.deleteMany({ where: { tenantId: demoTenant.id } });
  await prisma.taskAttachment.deleteMany({
    where: { task: { tenantId: demoTenant.id } },
  });
  await prisma.task.deleteMany({ where: { tenantId: demoTenant.id } });
  await prisma.project.deleteMany({ where: { tenantId: demoTenant.id } });
  await prisma.company.deleteMany({ where: { tenantId: demoTenant.id } });
  await prisma.user.deleteMany({ where: { tenantId: demoTenant.id } });

  // Create Users
  const users = await Promise.all([
    prisma.user.create({
      data: {
        tenantId: demoTenant.id,
        fullName: 'John Doe',
        email: 'john.doe@example.com',
        role: UserRole.Admin,
      },
    }),
    prisma.user.create({
      data: {
        tenantId: demoTenant.id,
        fullName: 'Jane Smith',
        email: 'jane.smith@example.com',
        role: UserRole.Manager,
      },
    }),
    prisma.user.create({
      data: {
        tenantId: demoTenant.id,
        fullName: 'Bob Johnson',
        email: 'bob.johnson@example.com',
        role: UserRole.Contributor,
      },
    }),
    prisma.user.create({
      data: {
        tenantId: demoTenant.id,
        fullName: 'Alice Williams',
        email: 'alice.williams@example.com',
        role: UserRole.Contributor,
      },
    }),
    prisma.user.create({
      data: {
        tenantId: demoTenant.id,
        fullName: 'Charlie Brown',
        email: 'charlie.brown@example.com',
        role: UserRole.Contributor,
      },
    }),
    prisma.user.create({
      data: {
        tenantId: demoTenant.id,
        fullName: 'Diana Prince',
        email: 'diana.prince@example.com',
        role: UserRole.Manager,
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create Companies
  const companies = await Promise.all([
    prisma.company.create({
      data: {
        tenantId: demoTenant.id,
        name: 'Acme Corporation',
        email: 'contact@acme.com',
        phone: '+1-555-0101',
        website: 'https://acme.com',
        address: '123 Main St, New York, NY 10001',
        notes: 'Long-term client, prefers agile methodology',
      },
    }),
    prisma.company.create({
      data: {
        tenantId: demoTenant.id,
        name: 'TechStart Inc',
        email: 'hello@techstart.io',
        phone: '+1-555-0202',
        website: 'https://techstart.io',
        address: '456 Innovation Dr, San Francisco, CA 94102',
        notes: 'Startup company, fast-paced environment',
      },
    }),
    prisma.company.create({
      data: {
        tenantId: demoTenant.id,
        name: 'Global Solutions Ltd',
        email: 'info@globalsolutions.com',
        phone: '+1-555-0303',
        website: 'https://globalsolutions.com',
        address: '789 Business Ave, Chicago, IL 60601',
      },
    }),
    prisma.company.create({
      data: {
        tenantId: demoTenant.id,
        name: 'Digital Ventures',
        email: 'contact@digitalventures.com',
        phone: '+1-555-0404',
        website: 'https://digitalventures.com',
        address: '321 Tech Blvd, Austin, TX 78701',
        notes: 'Focus on digital transformation projects',
      },
    }),
  ]);

  console.log(`✅ Created ${companies.length} companies`);

  // Create Projects
  const projects = [];
  const projectData = [
    { company: companies[0], name: 'E-commerce Platform Redesign', status: ProjectStatus.Active, startDate: new Date('2024-01-15'), targetEndDate: new Date('2024-06-30') },
    { company: companies[0], name: 'Mobile App Development', status: ProjectStatus.Active, startDate: new Date('2024-02-01'), targetEndDate: new Date('2024-08-15') },
    { company: companies[1], name: 'Cloud Migration Project', status: ProjectStatus.Active, startDate: new Date('2024-01-10'), targetEndDate: new Date('2024-05-20') },
    { company: companies[1], name: 'API Integration Suite', status: ProjectStatus.Planned, startDate: new Date('2024-03-01'), targetEndDate: new Date('2024-07-31') },
    { company: companies[2], name: 'Legacy System Modernization', status: ProjectStatus.Active, startDate: new Date('2023-12-01'), targetEndDate: new Date('2024-09-30') },
    { company: companies[2], name: 'Security Audit & Compliance', status: ProjectStatus.OnHold, startDate: new Date('2024-02-15'), targetEndDate: new Date('2024-06-30') },
    { company: companies[3], name: 'Customer Portal Development', status: ProjectStatus.Active, startDate: new Date('2024-01-20'), targetEndDate: new Date('2024-05-15') },
    { company: companies[3], name: 'Data Analytics Dashboard', status: ProjectStatus.Planned, startDate: new Date('2024-04-01'), targetEndDate: new Date('2024-08-31') },
    { company: companies[0], name: 'Website Redesign Phase 2', status: ProjectStatus.Completed, startDate: new Date('2023-10-01'), targetEndDate: new Date('2024-01-31') },
    { company: companies[1], name: 'DevOps Pipeline Setup', status: ProjectStatus.Completed, startDate: new Date('2023-11-15'), targetEndDate: new Date('2024-01-15') },
  ];

  for (const data of projectData) {
    const project = await prisma.project.create({
      data: {
        tenantId: demoTenant.id,
        companyId: data.company.id,
        name: data.name,
        description: `Project description for ${data.name}`,
        status: data.status,
        startDate: data.startDate,
        targetEndDate: data.targetEndDate,
      },
    });
    projects.push(project);
  }

  console.log(`✅ Created ${projects.length} projects`);

  // Create Tasks
  const tasks = [];
  const taskTemplates = [
    // Active project tasks
    { project: projects[0], title: 'Design new checkout flow', status: TaskStatus.InProgress, priority: TaskPriority.High, assignee: users[0] },
    { project: projects[0], title: 'Implement payment gateway', status: TaskStatus.InProgress, priority: TaskPriority.High, assignee: users[1] },
    { project: projects[0], title: 'Write unit tests', status: TaskStatus.Backlog, priority: TaskPriority.Medium, assignee: users[2] },
    { project: projects[0], title: 'Update product catalog API', status: TaskStatus.Blocked, priority: TaskPriority.Medium, assignee: users[1] },
    { project: projects[0], title: 'Code review for cart module', status: TaskStatus.Done, priority: TaskPriority.Low, assignee: users[0] },
    
    { project: projects[1], title: 'Setup React Native project', status: TaskStatus.InProgress, priority: TaskPriority.High, assignee: users[2] },
    { project: projects[1], title: 'Design app wireframes', status: TaskStatus.Done, priority: TaskPriority.Medium, assignee: users[3] },
    { project: projects[1], title: 'Implement authentication', status: TaskStatus.InProgress, priority: TaskPriority.High, assignee: users[2] },
    { project: projects[1], title: 'Setup CI/CD pipeline', status: TaskStatus.Backlog, priority: TaskPriority.Medium, assignee: users[4] },
    
    { project: projects[2], title: 'Migrate database to AWS RDS', status: TaskStatus.InProgress, priority: TaskPriority.High, assignee: users[1] },
    { project: projects[2], title: 'Configure load balancer', status: TaskStatus.InProgress, priority: TaskPriority.Medium, assignee: users[1] },
    { project: projects[2], title: 'Update DNS records', status: TaskStatus.Backlog, priority: TaskPriority.Low, assignee: users[4] },
    { project: projects[2], title: 'Performance testing', status: TaskStatus.Blocked, priority: TaskPriority.Medium, assignee: users[3] },
    
    { project: projects[4], title: 'Analyze legacy codebase', status: TaskStatus.Done, priority: TaskPriority.High, assignee: users[0] },
    { project: projects[4], title: 'Create migration plan', status: TaskStatus.Done, priority: TaskPriority.High, assignee: users[0] },
    { project: projects[4], title: 'Refactor authentication module', status: TaskStatus.InProgress, priority: TaskPriority.High, assignee: users[2] },
    { project: projects[4], title: 'Update documentation', status: TaskStatus.Backlog, priority: TaskPriority.Low, assignee: users[3] },
    
    { project: projects[6], title: 'Design user dashboard', status: TaskStatus.InProgress, priority: TaskPriority.Medium, assignee: users[3] },
    { project: projects[6], title: 'Implement user profile API', status: TaskStatus.InProgress, priority: TaskPriority.Medium, assignee: users[2] },
    { project: projects[6], title: 'Add password reset feature', status: TaskStatus.Backlog, priority: TaskPriority.Low, assignee: users[4] },
  ];

  for (const template of taskTemplates) {
    const task = await prisma.task.create({
      data: {
        tenantId: demoTenant.id,
        projectId: template.project.id,
        title: template.title,
        description: `Task description for ${template.title}`,
        status: template.status,
        priority: template.priority,
        assigneeId: template.assignee?.id,
        startDate: template.status !== TaskStatus.Backlog ? new Date() : null,
        estimatedEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        estimatedEffortHours: Math.floor(Math.random() * 20) + 2, // 2-22 hours
      },
    });
    tasks.push(task);
  }

  console.log(`✅ Created ${tasks.length} tasks`);

  // Create some attachments (metadata only, no actual files)
  const attachmentCount = Math.floor(tasks.length * 0.3); // ~30% of tasks have attachments
  for (let i = 0; i < attachmentCount; i++) {
    const task = tasks[Math.floor(Math.random() * tasks.length)];
    const fileNames = ['screenshot.png', 'design-mockup.jpg', 'diagram.png', 'reference.jpg'];
    const fileName = fileNames[Math.floor(Math.random() * fileNames.length)];
    
    await prisma.taskAttachment.create({
      data: {
        taskId: task.id,
        fileName: `${randomUUID()}-${fileName}`,
        originalName: fileName,
        mimeType: fileName.endsWith('.png') ? 'image/png' : 'image/jpeg',
        size: Math.floor(Math.random() * 5000000) + 100000, // 100KB - 5MB
        url: `/uploads/${randomUUID()}-${fileName}`,
      },
    });
  }

  console.log(`✅ Created ${attachmentCount} attachments`);

  // Create Time Entries for current week
  const today = new Date();
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
  currentWeekStart.setHours(0, 0, 0, 0);

  const timeEntries = [];
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const entryDate = new Date(currentWeekStart);
    entryDate.setDate(currentWeekStart.getDate() + dayOffset);

    // Create 2-5 time entries per day
    const entriesPerDay = Math.floor(Math.random() * 4) + 2;
    for (let i = 0; i < entriesPerDay; i++) {
      const task = tasks[Math.floor(Math.random() * tasks.length)];
      const user = users[Math.floor(Math.random() * users.length)];
      const hours = Math.random() * 4 + 1; // 1-5 hours

      const timeEntry = await prisma.timeEntry.create({
        data: {
          tenantId: demoTenant.id,
          taskId: task.id,
          userId: user.id,
          entryDate: entryDate,
          hours: hours.toFixed(2),
          notes: `Worked on ${task.title}`,
        },
      });
      timeEntries.push(timeEntry);
    }
  }

  console.log(`✅ Created ${timeEntries.length} time entries`);

  // Create Expenses (IT Procurement)
  // First, create some vendor companies (separate from client companies)
  const vendorCompanies = await Promise.all([
    prisma.company.create({
      data: {
        tenantId: demoTenant.id,
        name: 'Amazon Web Services',
        email: 'billing@aws.amazon.com',
        phone: '+1-206-266-1000',
        website: 'https://aws.amazon.com',
        address: '410 Terry Avenue North, Seattle, WA 98109',
        notes: 'Cloud infrastructure provider',
      },
    }),
    prisma.company.create({
      data: {
        tenantId: demoTenant.id,
        name: 'Microsoft Azure',
        email: 'support@azure.microsoft.com',
        phone: '+1-425-882-8080',
        website: 'https://azure.microsoft.com',
        address: 'One Microsoft Way, Redmond, WA 98052',
        notes: 'Cloud platform provider',
      },
    }),
    prisma.company.create({
      data: {
        tenantId: demoTenant.id,
        name: 'GitHub Inc',
        email: 'support@github.com',
        phone: '+1-415-735-4488',
        website: 'https://github.com',
        address: '88 Colin P Kelly Jr St, San Francisco, CA 94107',
        notes: 'Code repository and CI/CD platform',
      },
    }),
    prisma.company.create({
      data: {
        tenantId: demoTenant.id,
        name: 'Atlassian',
        email: 'support@atlassian.com',
        phone: '+1-415-701-1320',
        website: 'https://atlassian.com',
        address: '350 Bush Street, San Francisco, CA 94104',
        notes: 'Project management and collaboration tools',
      },
    }),
  ]);

  console.log(`✅ Created ${vendorCompanies.length} vendor companies`);

  // Create expenses with allocations
  const expenseData = [
    {
      company: vendorCompanies[0], // AWS
      invoiceNumber: 'AWS-2024-001',
      date: new Date('2024-01-15'),
      totalAmount: 2500.00,
      paymentMethod: PaymentMethod.CORPORATE_CREDIT_CARD,
      status: PaymentStatus.PAID,
      notes: 'Monthly AWS infrastructure costs',
      allocations: [
        { project: projects[0], amount: 1000.00 }, // E-commerce Platform
        { project: projects[2], amount: 1500.00 }, // Cloud Migration
      ],
    },
    {
      company: vendorCompanies[1], // Azure
      invoiceNumber: 'AZR-2024-002',
      date: new Date('2024-02-01'),
      totalAmount: 1800.50,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      status: PaymentStatus.PAID,
      notes: 'Azure services for Q1 2024',
      allocations: [
        { project: projects[2], amount: 1200.00 }, // Cloud Migration
        { project: projects[4], amount: 600.50 },  // Legacy System Modernization
      ],
    },
    {
      company: vendorCompanies[2], // GitHub
      invoiceNumber: 'GH-2024-003',
      date: new Date('2024-02-10'),
      totalAmount: 450.00,
      paymentMethod: PaymentMethod.CORPORATE_CREDIT_CARD,
      status: PaymentStatus.PAID,
      notes: 'GitHub Enterprise subscription',
      allocations: [
        { project: projects[0], amount: 150.00 }, // E-commerce Platform
        { project: projects[1], amount: 150.00 }, // Mobile App Development
        { project: projects[2], amount: 150.00 }, // Cloud Migration
      ],
    },
    {
      company: vendorCompanies[3], // Atlassian
      invoiceNumber: 'ATL-2024-004',
      date: new Date('2024-02-20'),
      totalAmount: 1200.00,
      paymentMethod: PaymentMethod.CORPORATE_CREDIT_CARD,
      status: PaymentStatus.PENDING,
      notes: 'Jira and Confluence licenses',
      allocations: [
        { project: projects[0], amount: 400.00 }, // E-commerce Platform
        { project: projects[1], amount: 400.00 }, // Mobile App Development
        { project: projects[6], amount: 400.00 }, // Customer Portal Development
      ],
    },
    {
      company: vendorCompanies[0], // AWS
      invoiceNumber: 'AWS-2024-005',
      date: new Date('2024-03-01'),
      totalAmount: 3200.75,
      paymentMethod: PaymentMethod.CORPORATE_CREDIT_CARD,
      status: PaymentStatus.PARTIALLY_PAID,
      notes: 'AWS services for February 2024',
      allocations: [
        { project: projects[0], amount: 1500.00 }, // E-commerce Platform
        { project: projects[2], amount: 1000.00 }, // Cloud Migration
        { project: projects[4], amount: 700.75 },  // Legacy System Modernization
      ],
    },
  ];

  for (const expenseInfo of expenseData) {
    const expense = await prisma.expense.create({
      data: {
        tenantId: demoTenant.id,
        companyId: expenseInfo.company.id,
        invoiceNumber: expenseInfo.invoiceNumber,
        date: expenseInfo.date,
        totalAmount: expenseInfo.totalAmount,
        paymentMethod: expenseInfo.paymentMethod,
        status: expenseInfo.status,
        notes: expenseInfo.notes,
      },
    });

    // Create allocations
    for (const allocation of expenseInfo.allocations) {
      await prisma.expenseAllocation.create({
        data: {
          expenseId: expense.id,
          projectId: allocation.project.id,
          allocatedAmount: allocation.amount,
        },
      });
    }
  }

  console.log(`✅ Created ${expenseData.length} expenses with allocations`);

  console.log('✨ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
