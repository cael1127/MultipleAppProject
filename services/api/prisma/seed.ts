import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  await prisma.vibeChallenge.deleteMany();
  await prisma.securityLesson.deleteMany();
  await prisma.securityModule.deleteMany();

  const alex = await prisma.user.upsert({
    where: { email: 'alex@secureguard.dev' },
    update: {},
    create: {
      email: 'alex@secureguard.dev',
      passwordHash,
      displayName: 'Alex Rivera',
      role: 'ADMIN',
    },
  });

  await prisma.securityIncident.create({
    data: {
      title: 'Payroll spreadsheet leak',
      severity: 'CRITICAL',
      description: 'Credentials for payroll system leaked on marketplace.',
      source: 'Dark Web',
      detectedAt: new Date(Date.now() - 1000 * 60 * 60 * 6),
      ownerId: alex.id,
      tasks: {
        create: [
          {
            title: 'Rotate payroll credentials',
            details: 'Generate new secrets and update vault.',
            status: 'ACTIVE',
            ownerId: alex.id,
          },
          {
            title: 'Contact legal partners',
            details: 'Initiate takedown playbook with partner firm.',
            status: 'PENDING',
            ownerId: alex.id,
          },
        ],
      },
    },
  });

  const priya = await prisma.user.upsert({
    where: { email: 'priya@nova.ai' },
    update: {},
    create: {
      email: 'priya@nova.ai',
      passwordHash,
      displayName: 'Priya Shah',
    },
  });

  await prisma.workflow.create({
    data: {
      name: 'Customer onboarding follow-up',
      description: 'Automates welcome outreach, ticket creation, and human approval.',
      ownerId: priya.id,
      steps: {
        create: [
          { kind: 'TRIGGER', position: 0, config: JSON.stringify({ channel: 'voice', keyword: 'onboarding' }) },
          { kind: 'DECISION', position: 1, config: JSON.stringify({ confidence: 0.7 }) },
          { kind: 'ACTION', position: 2, config: JSON.stringify({ action: 'createTicket', queue: 'success-team' }) },
        ],
      },
    },
  });

  const lina = await prisma.user.upsert({
    where: { email: 'lina@bloom.health' },
    update: {},
    create: {
      email: 'lina@bloom.health',
      passwordHash,
      displayName: 'Lina Gomez',
    },
  });

  await prisma.energySnapshot.createMany({
    data: [
      {
        ownerId: lina.id,
        recordedAt: new Date(),
        readiness: 82,
        sleepHours: 7.2,
        hrvScore: 68,
        tags: JSON.stringify(['travel']),
      },
      {
        ownerId: lina.id,
        recordedAt: new Date(Date.now() - 86_400_000),
        readiness: 74,
        sleepHours: 6.1,
        hrvScore: 60,
        tags: JSON.stringify(['late-night']),
      },
    ],
  });

  const marcus = await prisma.user.upsert({
    where: { email: 'marcus@ledgerloop.app' },
    update: {},
    create: {
      email: 'marcus@ledgerloop.app',
      passwordHash,
      displayName: 'Marcus Lee',
    },
  });

  const account = await prisma.financeAccount.create({
    data: {
      ownerId: marcus.id,
      name: 'Blue Ridge Checking',
      type: 'CHECKING',
      balance: 4200.32,
      currency: 'USD',
      transactions: {
        create: [
          { description: 'Freelance Retainer', amount: 2400, category: 'Income', occurredAt: new Date(Date.now() - 172_800_000) },
          { description: 'Studio Rent', amount: -950, category: 'Housing', occurredAt: new Date(Date.now() - 86_400_000) },
        ],
      },
    },
  });

  await prisma.autopilotRule.create({
    data: {
      ownerId: marcus.id,
      accountId: account.id,
      name: 'Tax Reserve',
      percentage: 0.3,
      destination: 'Tax Savings',
    },
  });

  const moduleSignal = await prisma.securityModule.create({
    data: {
      title: 'Signal Hunting with Vibe Coding',
      summary: 'Tune your instincts to spot shady scripts and rushed AI builds before they land in prod.',
      difficulty: 'intermediate',
      topics: JSON.stringify(['threat-intel', 'front-end review', 'red flags']),
      lessons: {
        create: [
          {
            title: 'Reading the room (and the repo)',
            content:
              'Start with the vibe: skim file names, folder structure, and build scripts. Note clashing conventions, duplicated tooling, or half-migrated frameworks.',
            kind: 'text',
            sortOrder: 0,
          },
          {
            title: 'Micro-signals in markup',
            content:
              'Hasty credential phishers leave breadcrumbs: inconsistent casing, inline styles on mission-critical buttons, unexplained tracking pixels, and `<script>` tags fetching from paste services.',
            kind: 'text',
            sortOrder: 1,
          },
          {
            title: 'Questions to ask your future self',
            content:
              'Why would an experienced engineer ship minified inline JS to production? What business reason justifies copycat CSS class names? Could this component be a lifted template?',
            kind: 'text',
            sortOrder: 2,
          },
        ],
      },
      challenges: {
        create: [
          {
            prompt: 'A new landing page shipped during the weekend. Skim the snippet and flag vibe-breaking signals.',
            snippet: `<section class="hero-container">
  <div class="Hero">
    <h1>Welcome to PayPortal new experience</h1>
    <script src="https://pastebin.com/raw/Za91qs"></script>
    <button style="background:#2185ff" onclick="window.location='https://payportal-support.com'">Verify account</button>
    <!-- TODO: Clean this later lol -->
  </div>
</section>`,
            hints: JSON.stringify([
              'Note inconsistent casing and inline styles',
              'External scripts from paste sites rarely belong in production',
              'Comments hinting at rushed deployment are a yellow flag',
            ]),
            solutionNotes:
              'The snippet mixes PascalCase and lower-case classes, pulls a script from Pastebin, and includes a suspicious verification CTA linking off-domain.',
            heuristics: JSON.stringify(['external-paste-script', 'inline-style-primary-action', 'suspicious-commentary']),
          },
        ],
      },
    },
    include: { lessons: true, challenges: true },
  });

  await prisma.securityProgress.upsert({
    where: {
      moduleId_userId: {
        moduleId: moduleSignal.id,
        userId: alex.id,
      },
    },
    update: {},
    create: {
      moduleId: moduleSignal.id,
      userId: alex.id,
      completedLessons: JSON.stringify(moduleSignal.lessons.slice(0, 1).map((lesson) => lesson.id)),
      completedChallenges: JSON.stringify([]),
      vibeConfidence: 0.45,
      notes: 'Confident spotting paste-bin scripts; still calibrating minified heuristics.',
    },
  });

  await prisma.securityPreference.upsert({
    where: { userId: alex.id },
    update: {
      onboardingComplete: true,
      preferredTone: 'security',
      shortcuts: JSON.stringify(['modules', 'incidents', 'lab']),
    },
    create: {
      userId: alex.id,
      onboardingComplete: true,
      preferredTone: 'security',
      shortcuts: JSON.stringify(['modules', 'incidents', 'lab']),
    },
  });

  await prisma.securityModule.create({
    data: {
      title: 'Reverse-engineering AI Website Builds',
      summary: 'Kick the tires on sites allegedly handcrafted by humans and tell when an LLM actually did the heavy lifting.',
      difficulty: 'advanced',
      topics: JSON.stringify(['ai-detection', 'code-style', 'source review']),
      lessons: {
        create: [
          {
            title: 'Language model fingerprints',
            content:
              'Generated UIs often reuse verbose component names, ship identical gradients, and include comment blocks describing what the code should do instead of why choices were made.',
            kind: 'text',
            sortOrder: 0,
          },
          {
            title: 'Temporal mismatches',
            content:
              'Look for libraries released after the commit timestamp, package versions that skip betas, or ESLint configs copied wholesale from latest boilerplates.',
            kind: 'text',
            sortOrder: 1,
          },
          {
            title: 'Triangulate with git hygiene',
            content:
              'Single mega-commits, missing history, and instant feature parity with reference designs are signals. Humans iterate; LLM dumps arrive fully formed.',
            kind: 'text',
            sortOrder: 2,
          },
        ],
      },
      challenges: {
        create: [
          {
            prompt: 'Review the component below and decide if it feels machine-generated or hand-crafted.',
            snippet: `export const PricingTiles = () => (
  <section className="pricingTilesWrapper">
    <h2 className="titleText">Choose plan best fits your success story</h2>
    <div className="tilesGrid">
      {[
        { tier: 'Starter', price: '$0', badge: 'Recommended' },
        { tier: 'Growth', price: '$29', badge: 'Popular' },
        { tier: 'Scale', price: '$99', badge: 'Business Friendly' },
      ].map((tile) => (
        <div key={tile.tier} className="pricingCardContainer">
          <p className="pricingCardTierTitle">{tile.tier}</p>
          <p className="pricingCardPrice">{tile.price}</p>
          <button className="pricingCardCtaButton">Start journey</button>
          <span className="pricingCardBadge">{tile.badge}</span>
        </div>
      ))}
    </div>
  </section>
);`,
            hints: JSON.stringify([
              'Repeated class naming pattern may indicate template output',
              'Copy tone ("Start journey") feels generic across tiers',
              'Data defined inline without business logic rationale',
            ]),
            solutionNotes:
              'The uniform class naming, marketing copy, and inline data array hint at boilerplate generation rather than bespoke engineering.',
            heuristics: JSON.stringify(['uniform-class-pattern', 'generic-copy', 'inline-data-structure']),
          },
        ],
      },
    },
  });

  const nora = await prisma.user.upsert({
    where: { email: 'nora@studyforge.edu' },
    update: {},
    create: {
      email: 'nora@studyforge.edu',
      passwordHash,
      displayName: 'Nora Chen',
    },
  });

  const sprint = await prisma.sprint.create({
    data: {
      ownerId: nora.id,
      title: 'HCI Research Sprint Week 3',
      objective: 'Draft prototype evaluation plan',
      startDate: new Date(),
      endDate: new Date(Date.now() + 5 * 86_400_000),
    },
  });

  await prisma.tutorSnapshot.create({
    data: {
      ownerId: nora.id,
      sprintId: sprint.id,
      summary: 'Need deeper rationale for methodology selection.',
      topics: JSON.stringify(['Methodology', 'Participant recruiting']),
      actionItems: JSON.stringify(['Rewrite introduction section', 'Send recruiting emails']),
    },
  });

  console.log('Seed data created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

