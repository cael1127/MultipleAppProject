import type { ChecklistItem } from '../components/Checklist';
import type { TimelineItem } from '../components/Timeline';

export type Persona = {
  name: string;
  role: string;
  focus: string;
  avatarInitials: string;
  summary: string;
};

export const personas = {
  security: {
    name: 'Alex Rivera',
    role: 'Security Lead, Freestyle Labs',
    focus: 'Identity monitoring & rapid takedowns',
    avatarInitials: 'AR',
    summary: 'Keeps a distributed team safe while traveling constantly.',
  },
  ai: {
    name: 'Priya Shah',
    role: 'Operations Director, Orbit Media',
    focus: 'Automating marketing handoffs',
    avatarInitials: 'PS',
    summary: 'Wants reliable AI that actually follows SOPs.',
  },
  wellness: {
    name: 'Lina Gomez',
    role: 'Product Designer, Remote',
    focus: 'Avoiding burnout across timezones',
    avatarInitials: 'LG',
    summary: 'Relies on wearables and journaling to stay grounded.',
  },
  finance: {
    name: 'Marcus Lee',
    role: 'Freelance Filmmaker',
    focus: 'Balancing variable income with savings goals',
    avatarInitials: 'ML',
    summary: 'Needs cashflow clarity across multiple income streams.',
  },
  education: {
    name: 'Nora Chen',
    role: 'Graduate Student, HCI',
    focus: 'Collaborative research sprints',
    avatarInitials: 'NC',
    summary: 'Juggles cohort deliverables and assistantship work.',
  },
} satisfies Record<string, Persona>;

export const securityChecklist: ChecklistItem[] = [
  {
    id: 'credential-scan',
    title: 'Rotate credentials flagged in last breach sweep',
    description: 'SecureGuard auto-generated strong credentials for 12 accounts.',
    status: 'done',
  },
  {
    id: 'darkweb-monitor',
    title: 'Verify dark web takedown progress',
    description: '3 high-risk mentions submitted to partner removal service.',
    status: 'in_progress',
  },
  {
    id: 'mfa-rollout',
    title: 'Expand hardware MFA to contractor accounts',
    description: 'Ship keys to 6 part-time staff and update onboarding flow.',
    status: 'queued',
  },
];

export const automationTimeline: TimelineItem[] = [
  {
    id: 'ingest',
    title: 'Knowledge ingest complete',
    timeLabel: '07:45',
    description: 'Synced 1.2k docs from Notion + Jira boards for grounding.',
    status: 'completed',
  },
  {
    id: 'training',
    title: 'Workflow rehearsal scheduled',
    timeLabel: '09:30',
    description: 'Team will role-play approval flow to fine-tune guardrails.',
    status: 'active',
  },
  {
    id: 'launch',
    title: 'Automation launch & monitoring',
    timeLabel: '13:00',
    description: 'Deploy Nova assistant to 4 channels with escalation triggers.',
    status: 'upcoming',
  },
];

export const wellnessJournalingPrompts: ChecklistItem[] = [
  {
    id: 'gratitude',
    title: 'Gratitude micro-journal',
    description: 'List three tiny wins that fueled your energy today.',
    status: 'done',
  },
  {
    id: 'energy-audit',
    title: 'Energy audit',
    description: 'Tag moments your energy dipped so Bloom can suggest resets.',
    status: 'in_progress',
  },
  {
    id: 'wind-down',
    title: 'Wind-down visualization',
    description: 'Prompted breathing walkthrough to ease into evening routine.',
    status: 'queued',
  },
];

export const financeTimeline: TimelineItem[] = [
  {
    id: 'paycheck',
    title: 'Paycheck landing',
    timeLabel: 'Today',
    description: 'Allocate $1,200 toward Q1 tax reserve and $300 to travel fund.',
    status: 'completed',
  },
  {
    id: 'subscription-audit',
    title: 'Subscription audit',
    timeLabel: 'Wed',
    description: 'Review auto-renewals flagged by LedgerLoop anomaly detection.',
    status: 'active',
  },
  {
    id: 'scenario',
    title: 'Scenario stress test',
    timeLabel: 'Sat',
    description: 'Model equipment upgrade purchase and adjust autopilot rules.',
    status: 'upcoming',
  },
];

export const securityTakedownTimeline: TimelineItem[] = [
  {
    id: 'alert',
    title: 'Dark web alert surfaced',
    timeLabel: '02:17',
    description: 'Compromised payroll spreadsheet spotted on marketplace.',
    status: 'completed',
  },
  {
    id: 'triage',
    title: 'Auto-triage & evidence capture',
    timeLabel: '02:19',
    description: 'SecureGuard generated takedown packet and notified counsel.',
    status: 'completed',
  },
  {
    id: 'removal',
    title: 'Partner takedown initiated',
    timeLabel: '02:32',
    description: 'Escalated to global partner for removal, SLA < 4 hours.',
    status: 'active',
  },
  {
    id: 'postmortem',
    title: 'Post-incident debrief',
    timeLabel: '08:00',
    description: 'Review employee access logs & update detection heuristics.',
    status: 'upcoming',
  },
];

export const wellnessRecoveryTimeline: TimelineItem[] = [
  {
    id: 'wake',
    title: 'Morning reset complete',
    timeLabel: '07:10',
    description: 'HRV up 12%. Bloom suggests light mobility + sunlight exposure.',
    status: 'completed',
  },
  {
    id: 'midday',
    title: 'Focus block alignment',
    timeLabel: '12:30',
    description: 'Energy dip flagged; scheduled 5-min breathing + hydration cue.',
    status: 'active',
  },
  {
    id: 'training',
    title: 'Strength training micro-cycle',
    timeLabel: '17:00',
    description: 'Adjust intensity based on recovery score and sleep debt.',
    status: 'upcoming',
  },
  {
    id: 'winddown',
    title: 'Wind-down ritual',
    timeLabel: '22:15',
    description: 'Guided journaling, blue light filter, and playlist queued.',
    status: 'upcoming',
  },
];

export const studyChecklist: ChecklistItem[] = [
  {
    id: 'sprint-plan',
    title: 'Sprint plan synced with cohort',
    description: 'Everyone committed to week 3 deliverables with focus areas.',
    status: 'done',
  },
  {
    id: 'tutor-review',
    title: 'AI tutor catch-up',
    description: 'Review flagged knowledge gaps before next lab.',
    status: 'in_progress',
  },
  {
    id: 'retro',
    title: 'Micro-retro & journaling',
    description: 'Reflect on obstacles; surface notes to accountability room.',
    status: 'queued',
  },
];

export const studySprintTimeline: TimelineItem[] = [
  {
    id: 'kickoff',
    title: 'Sprint kickoff sync',
    timeLabel: '09:00',
    description: 'AI tutor summarizes objectives and open blockers for the cohort.',
    status: 'completed',
  },
  {
    id: 'deep-work',
    title: 'Deep work session',
    timeLabel: '11:30',
    description: 'Cohort room opened; StudyForge tracks focus time and micro-deliverables.',
    status: 'active',
  },
  {
    id: 'lab-review',
    title: 'Lab review upload',
    timeLabel: '15:00',
    description: 'Auto-scans submission and highlights sections needing peer feedback.',
    status: 'upcoming',
  },
  {
    id: 'retro',
    title: 'Sprint retro',
    timeLabel: '19:00',
    description: 'Prompted reflection broadcast to accountability channel.',
    status: 'upcoming',
  },
];

