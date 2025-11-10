import { useCallback, useEffect, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SecureStore from 'expo-secure-store';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  Checklist,
  GradientLayout,
  ModalSheet,
  NavigationTabs,
  SectionCard,
  SparklineChart,
  StatBadge,
  Timeline,
  ToastProvider,
  palette,
  personas,
  studyChecklist,
  studySprintTimeline,
  useApi,
  useToast,
} from '@multiapps/common';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
const TOKEN_KEY = 'studyforge-token';
const persona = personas.education;

type TutorSnapshot = {
  id: string;
  summary: string;
  topics: string[];
  actionItems: string[];
  createdAt: string;
};

type FocusSession = {
  id: string;
  startedAt: string;
  endedAt?: string;
  notes?: string;
};

type Sprint = {
  id: string;
  title: string;
  objective: string;
  startDate: string;
  endDate: string;
  tutorSnapshots: TutorSnapshot[];
  focusSessions: FocusSession[];
};

type SprintsResponse = { sprints: Sprint[] };

type SprintForm = {
  title: string;
  objective: string;
  startDate: string;
  endDate: string;
};

type SnapshotForm = {
  sprintId: string | null;
  summary: string;
  topics: string;
  actionItems: string;
};

type FocusForm = {
  sprintId: string | null;
  startedAt: string;
  endedAt: string;
  notes: string;
};

type TabId = 'dashboard' | 'cohort' | 'sprints';

const defaultSprintForm: SprintForm = {
  title: 'Graph Theory Sprint',
  objective: 'Prove connectivity lemmas and prep for midterm oral defense.',
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
};

const defaultSnapshotForm: SnapshotForm = {
  sprintId: null,
  summary: 'Reviewed today’s deductions and queued spaced practice sets.',
  topics: 'Euler paths, bridge detection',
  actionItems: 'Re-derive theorem proofs, record explainer video',
};

const defaultFocusForm: FocusForm = {
  sprintId: null,
  startedAt: new Date().toISOString(),
  endedAt: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
  notes: 'Deep work block on theorem proofs.',
};

const cohortRooms = [
  {
    id: 'research-room',
    title: 'Research sprint room',
    description: 'Shared whiteboard, transcript, and async summary for lab partners.',
    members: 6,
    focusBlocks: 3,
  },
  {
    id: 'exam-huddle',
    title: 'Exam prep huddle',
    description: 'Timer-driven focus blocks with AI proctoring for accountability.',
    members: 4,
    focusBlocks: 2,
  },
  {
    id: 'writing-clinic',
    title: 'Thesis writing clinic',
    description: 'Weekly critiques plus AI-assisted edits and citation checks.',
    members: 8,
    focusBlocks: 5,
  },
];

export default function App() {
  return (
    <ToastProvider>
      <StudyForgeExperience />
    </ToastProvider>
  );
}

function StudyForgeExperience() {
  const toast = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('learner@example.com');
  const [password, setPassword] = useState('password123');
  const [displayName, setDisplayName] = useState('Learner');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [sprintForm, setSprintForm] = useState<SprintForm>(defaultSprintForm);
  const [snapshotForm, setSnapshotForm] = useState<SnapshotForm>(defaultSnapshotForm);
  const [focusForm, setFocusForm] = useState<FocusForm>(defaultFocusForm);

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY).then((stored) => {
      if (stored) {
        setToken(stored);
      }
    });
  }, []);

  const sprintsQuery = useApi<SprintsResponse>({
    path: '/study/sprints',
    token,
    skip: !token,
    cacheKey: 'study.sprints',
  });

  const sprints = useMemo(() => sprintsQuery.data?.sprints ?? [], [sprintsQuery.data]);
  const currentSprint = sprints[0] ?? null;

  useEffect(() => {
    if (sprints.length && !snapshotForm.sprintId) {
      setSnapshotForm((prev) => ({ ...prev, sprintId: sprints[0].id }));
    }
    if (sprints.length && !focusForm.sprintId) {
      setFocusForm((prev) => ({ ...prev, sprintId: sprints[0].id }));
    }
  }, [focusForm.sprintId, sprints, snapshotForm.sprintId]);

  const secureFetch = useCallback(
    async (path: string, body: Record<string, unknown>, method: 'POST' | 'PATCH' = 'POST') => {
      if (!token) {
        throw new Error('Authentication required');
      }
      const response = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message ?? 'Request failed');
      }
      return response.json();
    },
    [token],
  );

  const handleAuth = useCallback(async () => {
    try {
      setLoadingAuth(true);
      setAuthError(null);
      const payload =
        mode === 'login'
          ? { email, password }
          : {
              email,
              password,
              displayName,
            };
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const message = await response.json().catch(() => ({}));
        throw new Error(message?.message ?? 'Authentication failed');
      }
      const data = (await response.json()) as { token: string };
      await SecureStore.setItemAsync(TOKEN_KEY, data.token);
      setToken(data.token);
      toast.show({ title: 'Signed in', description: 'StudyForge synced with backend.', tone: 'education' });
      sprintsQuery.refetch();
      setOnboardingVisible(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to authenticate';
      setAuthError(message);
      toast.show({ title: 'Authentication failed', description: message, tone: 'education' });
    } finally {
      setLoadingAuth(false);
    }
  }, [displayName, email, mode, password, sprintsQuery, toast]);

  const handleLogout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    toast.show({ title: 'Signed out', description: 'Session cleared.', tone: 'education' });
  }, [toast]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await sprintsQuery.refetch();
    setRefreshing(false);
    toast.show({ title: 'Synced', description: 'Fetched latest sprints and snapshots.', tone: 'education' });
  }, [sprintsQuery, toast]);

  const handleSprintSubmit = useCallback(async () => {
    try {
      if (!sprintForm.title.trim() || !sprintForm.objective.trim()) {
        toast.show({ title: 'Missing fields', description: 'Provide a title and objective.', tone: 'education' });
        return;
      }
      await secureFetch('/study/sprints', {
        title: sprintForm.title,
        objective: sprintForm.objective,
        startDate: sprintForm.startDate,
        endDate: sprintForm.endDate,
      });
      setSprintForm(defaultSprintForm);
      sprintsQuery.refetch();
      toast.show({ title: 'Sprint created', description: 'Sprint added to your command deck.', tone: 'education' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to create sprint';
      toast.show({ title: 'Save failed', description: message, tone: 'education' });
    }
  }, [secureFetch, sprintForm, sprintsQuery, toast]);

  const handleSnapshotSubmit = useCallback(async () => {
    try {
      if (!snapshotForm.summary.trim()) {
        toast.show({ title: 'Missing summary', description: 'Add a quick summary before saving.', tone: 'education' });
        return;
      }
      await secureFetch('/study/tutor-snapshots', {
        sprintId: snapshotForm.sprintId ?? undefined,
        summary: snapshotForm.summary,
        topics: snapshotForm.topics.split(',').map((topic) => topic.trim()).filter(Boolean),
        actionItems: snapshotForm.actionItems.split(',').map((item) => item.trim()).filter(Boolean),
      });
      sprintsQuery.refetch();
      toast.show({ title: 'Snapshot saved', description: 'AI tutor log updated.', tone: 'education' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save snapshot';
      toast.show({ title: 'Save failed', description: message, tone: 'education' });
    }
  }, [secureFetch, snapshotForm, sprintsQuery, toast]);

  const handleFocusSubmit = useCallback(async () => {
    try {
      if (!focusForm.startedAt.trim()) {
        toast.show({ title: 'Start time missing', description: 'Set a focus start time.', tone: 'education' });
        return;
      }
      await secureFetch('/study/focus-sessions', {
        sprintId: focusForm.sprintId ?? undefined,
        startedAt: focusForm.startedAt,
        endedAt: focusForm.endedAt || undefined,
        notes: focusForm.notes || undefined,
      });
      sprintsQuery.refetch();
      toast.show({ title: 'Session logged', description: 'Focus analytics updated.', tone: 'education' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to log session';
      toast.show({ title: 'Save failed', description: message, tone: 'education' });
    }
  }, [focusForm, secureFetch, sprintsQuery, toast]);

  const totalFocusHours = useMemo(() => {
    if (!currentSprint) {
      return 0;
    }
    return currentSprint.focusSessions.reduce((sum, session) => {
      const start = new Date(session.startedAt).getTime();
      const end = session.endedAt ? new Date(session.endedAt).getTime() : Date.now();
      const diff = Math.max(0, end - start);
      return sum + diff / (1000 * 60 * 60);
    }, 0);
  }, [currentSprint]);

  const tutorAssistCount = useMemo(() => currentSprint?.tutorSnapshots.length ?? 0, [currentSprint]);
  const cohortRoomCount = cohortRooms.length;

  const studyStats = useMemo(
    () => [
      {
        label: 'Focus hours',
        value: `${totalFocusHours.toFixed(1)}h`,
        delta: currentSprint ? `${currentSprint.focusSessions.length} sessions` : 'Log a session',
        trend: totalFocusHours >= 5 ? ('up' as const) : ('steady' as const),
      },
      {
        label: 'Tutor assists',
        value: `${tutorAssistCount}`,
        delta: currentSprint ? 'This sprint' : 'Create a sprint first',
        trend: tutorAssistCount >= 3 ? ('up' as const) : ('steady' as const),
      },
      {
        label: 'Cohort rooms',
        value: `${cohortRoomCount} live`,
        delta: 'Active now',
        trend: ('up' as const),
      },
    ],
    [cohortRoomCount, currentSprint, totalFocusHours, tutorAssistCount],
  );

  const readinessSpark = useMemo(() => {
    if (!currentSprint || !currentSprint.focusSessions.length) {
      return [
        { label: 'Mon', value: 2 },
        { label: 'Tue', value: 1.5 },
        { label: 'Wed', value: 0 },
        { label: 'Thu', value: 3 },
        { label: 'Fri', value: 0 },
      ];
    }
    const sessionsByDay = currentSprint.focusSessions.reduce<Record<string, number>>((map, session) => {
      const day = new Date(session.startedAt).toLocaleDateString(undefined, { weekday: 'short' });
      const start = new Date(session.startedAt).getTime();
      const end = session.endedAt ? new Date(session.endedAt).getTime() : start;
      const hours = Math.max(0, (end - start) / (1000 * 60 * 60));
      map[day] = (map[day] ?? 0) + hours;
      return map;
    }, {});
    return Object.entries(sessionsByDay).map(([label, value]) => ({ label, value }));
  }, [currentSprint]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <View style={styles.sectionGap}>
            <SectionCard tone="education" elevation="soft">
              <Text style={styles.sectionTitle}>Tutor intelligence</Text>
              <Text style={styles.sectionSubtitle}>
                Summaries, topics, and action items pulled from every adaptive tutor check-in.
              </Text>
              {currentSprint ? (
                <View style={styles.snapshotList}>
                  {currentSprint.tutorSnapshots.length === 0 ? (
                    <Text style={styles.bodyText}>No snapshots yet. Save one below to populate.</Text>
                  ) : (
                    currentSprint.tutorSnapshots.map((snapshot) => (
                      <View key={snapshot.id} style={styles.snapshotItem}>
                        <Text style={styles.snapshotTitle}>{snapshot.summary}</Text>
                        <Text style={styles.snapshotMeta}>
                          {new Date(snapshot.createdAt).toLocaleString()} · Topics: {snapshot.topics.join(', ') || '—'}
                        </Text>
                        <Text style={styles.snapshotBody}>Action items: {snapshot.actionItems.join(', ') || 'None'}</Text>
                      </View>
                    ))
                  )}
                </View>
              ) : (
                <Text style={styles.bodyText}>Create a sprint to see tutor intelligence roll in.</Text>
              )}
            </SectionCard>
            <SectionCard tone="education" elevation="none">
              <Text style={styles.sectionTitleSmall}>Sprint timeline</Text>
              <Timeline items={studySprintTimeline} tone="education" />
            </SectionCard>
            <SectionCard tone="education" elevation="none">
              <Text style={styles.sectionTitleSmall}>Focus checklist</Text>
              <Checklist items={studyChecklist} tone="education" />
            </SectionCard>
          </View>
        );
      case 'cohort':
        return (
          <View style={styles.sectionGap}>
            <SectionCard tone="education" elevation="soft">
              <Text style={styles.sectionTitle}>Live cohort rooms</Text>
              <Text style={styles.sectionSubtitle}>
                Drop into async and live rooms powered by shared boards, transcripts, and pace targets.
              </Text>
              <View style={styles.roomList}>
                {cohortRooms.map((room) => (
                  <View key={room.id} style={styles.roomCard}>
                    <Text style={styles.roomTitle}>{room.title}</Text>
                    <Text style={styles.roomMeta}>{room.members} members · {room.focusBlocks} focus blocks today</Text>
                    <Text style={styles.roomBody}>{room.description}</Text>
                    <Pressable
                      style={styles.joinButton}
                      onPress={() =>
                        toast.show({
                          title: 'Room opened',
                          description: `${room.title} ready with shared notes.`,
                          tone: 'education',
                        })
                      }
                    >
                      <Text style={styles.joinButtonText}>Open room</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </SectionCard>
            <SectionCard tone="education" elevation="none">
              <Text style={styles.sectionTitleSmall}>Log focus session</Text>
              <TextInput
                value={focusForm.startedAt}
                onChangeText={(value) => setFocusForm((prev) => ({ ...prev, startedAt: value }))}
                placeholder="Started at (ISO)"
                placeholderTextColor="#bae6fd"
                style={styles.input}
              />
              <TextInput
                value={focusForm.endedAt}
                onChangeText={(value) => setFocusForm((prev) => ({ ...prev, endedAt: value }))}
                placeholder="Ended at (ISO)"
                placeholderTextColor="#bae6fd"
                style={styles.input}
              />
              <TextInput
                value={focusForm.notes}
                onChangeText={(value) => setFocusForm((prev) => ({ ...prev, notes: value }))}
                placeholder="Notes"
                placeholderTextColor="#bae6fd"
                style={styles.input}
              />
              <Pressable style={styles.primaryButton} onPress={handleFocusSubmit}>
                <Text style={styles.primaryButtonText}>Log session</Text>
              </Pressable>
            </SectionCard>
          </View>
        );
      case 'sprints':
        return (
          <View style={styles.sectionGap}>
            <SectionCard tone="education" elevation="soft">
              <Text style={styles.sectionTitle}>Create sprint</Text>
              <Text style={styles.sectionSubtitle}>
                Define the objective, timeline, and expected deliverables for your next study push.
              </Text>
              <TextInput
                value={sprintForm.title}
                onChangeText={(value) => setSprintForm((prev) => ({ ...prev, title: value }))}
                placeholder="Sprint title"
                placeholderTextColor="#bae6fd"
                style={styles.input}
              />
              <TextInput
                value={sprintForm.objective}
                onChangeText={(value) => setSprintForm((prev) => ({ ...prev, objective: value }))}
                placeholder="Objective"
                placeholderTextColor="#bae6fd"
                style={styles.input}
              />
              <TextInput
                value={sprintForm.startDate}
                onChangeText={(value) => setSprintForm((prev) => ({ ...prev, startDate: value }))}
                placeholder="Start date (ISO)"
                placeholderTextColor="#bae6fd"
                style={styles.input}
              />
              <TextInput
                value={sprintForm.endDate}
                onChangeText={(value) => setSprintForm((prev) => ({ ...prev, endDate: value }))}
                placeholder="End date (ISO)"
                placeholderTextColor="#bae6fd"
                style={styles.input}
              />
              <Pressable style={styles.primaryButton} onPress={handleSprintSubmit}>
                <Text style={styles.primaryButtonText}>Save sprint</Text>
              </Pressable>
            </SectionCard>
            <SectionCard tone="education" elevation="none">
              <Text style={styles.sectionTitleSmall}>Tutor snapshot</Text>
              <TextInput
                value={snapshotForm.summary}
                onChangeText={(value) => setSnapshotForm((prev) => ({ ...prev, summary: value }))}
                placeholder="Summary"
                placeholderTextColor="#bae6fd"
                style={styles.input}
              />
              <TextInput
                value={snapshotForm.topics}
                onChangeText={(value) => setSnapshotForm((prev) => ({ ...prev, topics: value }))}
                placeholder="Topics (comma separated)"
                placeholderTextColor="#bae6fd"
                style={styles.input}
              />
              <TextInput
                value={snapshotForm.actionItems}
                onChangeText={(value) => setSnapshotForm((prev) => ({ ...prev, actionItems: value }))}
                placeholder="Action items (comma separated)"
                placeholderTextColor="#bae6fd"
                style={styles.input}
              />
              <Pressable style={styles.primaryButton} onPress={handleSnapshotSubmit}>
                <Text style={styles.primaryButtonText}>Save snapshot</Text>
              </Pressable>
            </SectionCard>
            <SectionCard tone="education" elevation="none">
              <Text style={styles.sectionTitleSmall}>Active sprints</Text>
              {sprints.length === 0 ? (
                <Text style={styles.bodyText}>No sprints yet. Create one above to get started.</Text>
              ) : (
                sprints.map((sprint) => (
                  <View key={sprint.id} style={styles.sprintCard}>
                    <Text style={styles.sprintTitle}>{sprint.title}</Text>
                    <Text style={styles.sprintMeta}>
                      {new Date(sprint.startDate).toLocaleDateString()} → {new Date(sprint.endDate).toLocaleDateString()}
                    </Text>
                    <Text style={styles.sprintObjective}>{sprint.objective}</Text>
                    <Text style={styles.sprintStats}>
                      {sprint.focusSessions.length} focus sessions · {sprint.tutorSnapshots.length} tutor snapshots
                    </Text>
                  </View>
                ))
              )}
            </SectionCard>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <ModalSheet
        visible={onboardingVisible}
        tone="education"
        title="Welcome to StudyForge Command Deck"
        description="Coordinate AI tutors, focus analytics, and cohort rooms to ship research faster."
        onClose={() => setOnboardingVisible(false)}
        actions={[
          {
            id: 'continue',
            label: 'Start sprinting',
            tone: 'education',
            onPress: () => setOnboardingVisible(false),
          },
        ]}
      >
        <Text style={styles.modalBullet}>• Create sprints so tutor snapshots and focus metrics stay aligned.</Text>
        <Text style={styles.modalBullet}>• Log focus blocks to keep the analytics sparkline updated.</Text>
        <Text style={styles.modalBullet}>• Jump into cohort rooms to share boards, transcripts, and milestones.</Text>
      </ModalSheet>

      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <GradientLayout tone="education">
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl tintColor="#bfdbfe" refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <View style={styles.hero}>
              <View style={styles.heroCopy}>
                <Text style={styles.eyeBrow}>Sprint Intelligence</Text>
                <Text style={styles.title}>StudyForge Command Deck</Text>
                <Text style={styles.subtitle}>
                  Merge AI tutors, focus analytics, and cohort rooms to ship research faster.
                </Text>
              </View>
              <SectionCard tone="education" padding={18} elevation="soft" style={styles.personaCard}>
                <Text style={styles.personaLabel}>Lead learner</Text>
                <Text style={styles.personaName}>{persona.name}</Text>
                <Text style={styles.personaRole}>{persona.role}</Text>
                <Text style={styles.personaSummary}>{persona.focus}</Text>
                <NavigationTabs
                  items={[
                    { id: 'dashboard', label: 'Dashboard' },
                    { id: 'cohort', label: `Cohort (${cohortRooms.length})` },
                    { id: 'sprints', label: `Sprints (${sprints.length})` },
                  ]}
                  activeId={activeTab}
                  onChange={(tabId) => setActiveTab(tabId as TabId)}
                />
              </SectionCard>
            </View>

            <View style={styles.statsRow}>
              {studyStats.map((stat) => (
                <StatBadge key={stat.label} tone="education" {...stat} style={styles.statBadge} />
              ))}
            </View>

            {!token ? (
              <SectionCard tone="education" elevation="soft">
                <Text style={styles.sectionTitle}>Link StudyForge backend</Text>
                <Text style={styles.sectionSubtitle}>
                  Sign in to sync AI tutor snapshots, focus sessions, and sprint timelines.
                </Text>
                <View style={styles.toggleRow}>
                  <Pressable
                    style={[styles.toggleButton, mode === 'login' && styles.toggleButtonActive]}
                    onPress={() => setMode('login')}
                  >
                    <Text style={styles.toggleText}>Login</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.toggleButton, mode === 'register' && styles.toggleButtonActive]}
                    onPress={() => setMode('register')}
                  >
                    <Text style={styles.toggleText}>Register</Text>
                  </Pressable>
    </View>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="learner@example.com"
                  placeholderTextColor="#bfdbfe"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="#bfdbfe"
                  secureTextEntry
                  style={styles.input}
                />
                {mode === 'register' ? (
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Display name"
                    placeholderTextColor="#bfdbfe"
                    style={styles.input}
                  />
                ) : null}
                {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
                <Pressable style={styles.primaryButton} onPress={handleAuth} disabled={loadingAuth}>
                  {loadingAuth ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.primaryButtonText}>Continue</Text>}
                </Pressable>
              </SectionCard>
            ) : (
              <SectionCard tone="education" elevation="soft">
                <Text style={styles.sectionTitle}>Connected to StudyForge cloud</Text>
                <Text style={styles.sectionSubtitle}>Refresh to pull latest tutor intelligence and focus metrics.</Text>
                <Pressable style={[styles.primaryButton, styles.logoutButton]} onPress={handleLogout}>
                  <Text style={[styles.primaryButtonText, styles.logoutText]}>Log out</Text>
                </Pressable>
              </SectionCard>
            )}

            <SectionCard tone="education" elevation="soft">
              <SparklineChart
                tone="education"
                title="Focus trend"
                subtitle={currentSprint ? `${currentSprint.focusSessions.length} sessions this sprint` : 'Log a session to update'}
                data={readinessSpark}
              />
            </SectionCard>

            {renderTabContent()}
          </ScrollView>
        </GradientLayout>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    padding: 24,
    gap: 24,
    paddingBottom: 64,
  },
  hero: {
    gap: 24,
  },
  heroCopy: {
    gap: 12,
  },
  eyeBrow: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    color: palette.education.accent,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: palette.education.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    color: palette.education.textSecondary,
    lineHeight: 22,
  },
  personaCard: {
    gap: 12,
  },
  personaLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#93c5fd',
  },
  personaName: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.education.textPrimary,
  },
  personaRole: {
    fontSize: 14,
    color: palette.education.textSecondary,
  },
  personaSummary: {
    fontSize: 14,
    color: palette.education.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statBadge: {
    flexBasis: '30%',
    flexGrow: 1,
  },
  sectionGap: {
    gap: 18,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#dbeafe',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: '#bfdbfe',
    lineHeight: 22,
    marginBottom: 12,
  },
  sectionTitleSmall: {
    fontSize: 18,
    fontWeight: '600',
    color: '#dbeafe',
  },
  bodyText: {
    color: '#bfdbfe',
    lineHeight: 20,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(17, 24, 39, 0.6)',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.25)',
  },
  toggleText: {
    color: '#dbeafe',
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.25)',
    color: '#dbeafe',
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
    marginTop: 10,
  },
  primaryButton: {
    backgroundColor: '#60a5fa',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  primaryButtonText: {
    fontWeight: '700',
    fontSize: 16,
    color: '#0f172a',
  },
  logoutButton: {
    backgroundColor: 'rgba(96, 165, 250, 0.15)',
  },
  logoutText: {
    color: '#60a5fa',
  },
  errorText: {
    color: '#f97316',
    fontWeight: '600',
    marginTop: 10,
  },
  snapshotList: {
    gap: 14,
  },
  snapshotItem: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.25)',
    gap: 6,
  },
  snapshotTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dbeafe',
  },
  snapshotMeta: {
    color: '#bfdbfe',
    fontSize: 12,
  },
  snapshotBody: {
    color: '#bfdbfe',
  },
  roomList: {
    gap: 14,
  },
  roomCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.25)',
    gap: 8,
  },
  roomTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dbeafe',
  },
  roomMeta: {
    color: '#bfdbfe',
    fontSize: 13,
  },
  roomBody: {
    color: '#bfdbfe',
    lineHeight: 20,
  },
  joinButton: {
    marginTop: 8,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(96, 165, 250, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.35)',
  },
  joinButtonText: {
    color: '#dbeafe',
    fontWeight: '600',
  },
  sprintCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.25)',
    gap: 6,
  },
  sprintTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dbeafe',
  },
  sprintMeta: {
    color: '#bfdbfe',
    fontSize: 12,
  },
  sprintObjective: {
    color: '#bfdbfe',
    lineHeight: 20,
  },
  sprintStats: {
    color: '#bfdbfe',
    fontWeight: '600',
  },
  modalBullet: {
    color: '#bfdbfe',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
});