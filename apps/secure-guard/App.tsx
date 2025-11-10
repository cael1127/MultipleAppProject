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
  InfoCard,
  ModalSheet,
  NavigationTabs,
  SectionCard,
  SparklineChart,
  StatBadge,
  Timeline,
  ToastProvider,
  palette,
  personas,
  securityChecklist,
  securityTakedownTimeline,
  useApi,
  useToast,
} from '@multiapps/common';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
const TOKEN_KEY = 'secureguard-token';

const persona = personas.security;
const identityStats = [
  { label: 'Identities protected', value: '248', delta: '+12 this week', trend: 'up' as const },
  { label: 'Open incidents', value: '3', delta: '−2 vs avg', trend: 'down' as const },
  { label: 'Median response', value: '02h 14m', delta: 'Live SLA', trend: 'steady' as const },
];

const codePlaceholder = `<section class="hero-container">
  <div class="Hero">
    <h1>Paste suspicious markup or UI code here…</h1>
    <button class="primaryCta">Review</button>
  </div>
</section>`;

type SecurityTask = {
  id: string;
  title: string;
  details: string;
  status: 'PENDING' | 'ACTIVE' | 'DONE';
  checklistUrl?: string | null;
};

type SecurityIncident = {
  id: string;
  title: string;
  severity: string;
  status: string;
  description: string;
  detectedAt: string;
  tasks: SecurityTask[];
};

type SecurityLesson = {
  id: string;
  title: string;
  content: string;
  kind: string;
  sortOrder: number;
};

type VibeChallenge = {
  id: string;
  prompt: string;
  snippet: string;
  hints: string[];
  solutionNotes: string;
  heuristics: string[];
};

type ModuleProgress = {
  id: string;
  moduleId: string;
  completedLessons: string[];
  completedChallenges: string[];
  vibeConfidence: number;
  notes: string;
  updatedAt: string;
};

type SecurityModule = {
  id: string;
  title: string;
  summary: string;
  difficulty: string;
  topics: string[];
  lessons: SecurityLesson[];
  challenges: VibeChallenge[];
  progress: ModuleProgress | null;
};

type AnalysisResult = {
  score: number;
  verdict: string;
  metrics: {
    lineCount: number;
    avgLineLength: number;
    commentDensity: number;
  };
  signals: string[];
};

type SecurityPreference = {
  id: string;
  onboardingComplete: boolean;
  preferredTone: string;
  shortcuts: string[];
};

type ModulesResponse = { modules: SecurityModule[] };
type IncidentsResponse = { incidents: SecurityIncident[] };
type PreferencesResponse = { preferences: SecurityPreference | null };

type TabId = 'modules' | 'lab' | 'incidents';

export default function App() {
  return (
    <ToastProvider>
      <SecureGuardScreen />
    </ToastProvider>
  );
}

function SecureGuardScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('analyst@example.com');
  const [password, setPassword] = useState('password123');
  const [displayName, setDisplayName] = useState('Analyst');
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('modules');
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [codeSample, setCodeSample] = useState(codePlaceholder);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisResult[]>([]);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY).then((value) => {
      if (value) {
        setToken(value);
      }
    });
  }, []);

  const modulesQuery = useApi<ModulesResponse>({
    path: '/security/modules',
    cacheKey: 'security.modules',
  });

  const incidentsQuery = useApi<IncidentsResponse>({
    path: '/security/incidents',
    token,
    skip: !token,
    cacheKey: 'security.incidents',
  });

  const preferencesQuery = useApi<PreferencesResponse>({
    path: '/security/preferences',
    token,
    skip: !token,
    cacheKey: 'security.preferences',
  });

  const modules = useMemo(() => modulesQuery.data?.modules ?? [], [modulesQuery.data]);
  const incidents = useMemo(() => incidentsQuery.data?.incidents ?? [], [incidentsQuery.data]);
  const preferences = useMemo(() => preferencesQuery.data?.preferences ?? null, [preferencesQuery.data]);
  const selectedModule = modules.find((module) => module.id === selectedModuleId) ?? modules[0] ?? null;
  const selectedChallenge =
    selectedModule?.challenges.find((challenge) => challenge.id === selectedChallengeId) ??
    selectedModule?.challenges[0] ??
    null;

  useEffect(() => {
    if (!selectedModuleId && modules.length) {
      setSelectedModuleId(modules[0].id);
    }
  }, [modules, selectedModuleId]);

  useEffect(() => {
    if (!selectedChallengeId && selectedModule?.challenges.length) {
      setSelectedChallengeId(selectedModule.challenges[0].id);
    }
  }, [selectedChallengeId, selectedModule]);

  useEffect(() => {
    if (token && preferences && !preferences.onboardingComplete) {
      setOnboardingVisible(true);
    }
  }, [token, preferences]);

  const secureFetch = useCallback(
    async (path: string, body?: Record<string, unknown>, method: 'POST' | 'PATCH' = 'POST') => {
      if (!token) {
        throw new Error('Authentication required');
      }
      const response = await fetch(`${API_URL}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message ?? `Request failed (${response.status})`);
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
      toast.show({ title: 'Signed in', description: 'SecureGuard backend linked.', tone: 'security' });
      incidentsQuery.refetch();
      preferencesQuery.refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to authenticate';
      setAuthError(message);
      toast.show({ title: 'Authentication failed', description: message, tone: 'security' });
    } finally {
      setLoadingAuth(false);
    }
  }, [displayName, email, incidentsQuery, mode, password, preferencesQuery, toast]);

  const handleLogout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    toast.show({ title: 'Signed out', description: 'Session cleared.', tone: 'security' });
  }, [toast]);

  const handleProgressUpdate = useCallback(
    async ({
      moduleId,
      completedLessons,
      completedChallenges,
      vibeConfidence,
      notes,
    }: {
      moduleId: string;
      completedLessons?: string[];
      completedChallenges?: string[];
      vibeConfidence?: number;
      notes?: string;
    }) => {
      await secureFetch('/security/progress', {
        moduleId,
        completedLessons,
        completedChallenges,
        vibeConfidence,
        notes,
      });
      await modulesQuery.refetch();
      toast.show({ title: 'Progress synced', description: 'Module progress saved.', tone: 'security' });
    },
    [modulesQuery, secureFetch, toast],
  );

  const toggleLessonCompletion = useCallback(
    async (lessonId: string) => {
      if (!selectedModule) return;
      if (!token) {
        toast.show({ title: 'Sign in to track progress', description: 'Log in to persist lessons.', tone: 'security' });
        return;
      }
      const current = new Set(selectedModule.progress?.completedLessons ?? []);
      if (current.has(lessonId)) {
        current.delete(lessonId);
      } else {
        current.add(lessonId);
      }
      await handleProgressUpdate({
        moduleId: selectedModule.id,
        completedLessons: Array.from(current),
        completedChallenges: selectedModule.progress?.completedChallenges ?? [],
        vibeConfidence: selectedModule.progress?.vibeConfidence,
        notes: selectedModule.progress?.notes,
      });
    },
    [handleProgressUpdate, selectedModule, toast, token],
  );

  const markChallengeOutcome = useCallback(
    async (challengeId: string, outcome: 'flagged' | 'clean') => {
      if (!selectedModule) return;
      if (!token) {
        toast.show({ title: 'Sign in to log outcomes', description: 'Authenticate to save challenge notes.', tone: 'security' });
        return;
      }
      const completedChallenges = new Set(selectedModule.progress?.completedChallenges ?? []);
      completedChallenges.add(`${challengeId}:${outcome}`);
      await handleProgressUpdate({
        moduleId: selectedModule.id,
        completedLessons: selectedModule.progress?.completedLessons ?? [],
        completedChallenges: Array.from(completedChallenges),
        vibeConfidence: outcome === 'flagged' ? 0.8 : 0.45,
      });
    },
    [handleProgressUpdate, selectedModule, toast, token],
  );

  const handleTaskStatusUpdate = useCallback(
    async (taskId: string, status: 'DONE' | 'ACTIVE' | 'PENDING') => {
      try {
        await secureFetch(`/security/tasks/${taskId}`, { status }, 'PATCH');
        incidentsQuery.refetch();
        toast.show({ title: 'Task updated', description: `Marked task as ${status.toLowerCase()}.`, tone: 'security' });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to update task';
        toast.show({ title: 'Update failed', description: message, tone: 'security' });
      }
    },
    [incidentsQuery, secureFetch, toast],
  );

  const analyzeSnippet = useCallback(async () => {
    try {
      setAnalysisLoading(true);
      setAnalysisResult(null);
      const response = await fetch(`${API_URL}/security/analyze-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeSample }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.message ?? 'Failed to analyze snippet');
      }
      const data = (await response.json()) as { analysis: AnalysisResult };
      setAnalysisResult(data.analysis);
      setAnalysisHistory((history) => [data.analysis, ...history].slice(0, 6));
      toast.show({ title: data.analysis.verdict, description: 'Heuristics ready below.', tone: 'security' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to analyze snippet';
      setAnalysisResult({
        score: 0,
        verdict: message,
        metrics: { lineCount: 0, avgLineLength: 0, commentDensity: 0 },
        signals: [],
      });
      toast.show({ title: 'Analysis failed', description: message, tone: 'security' });
    } finally {
      setAnalysisLoading(false);
    }
  }, [codeSample, toast]);

  const completeOnboarding = useCallback(async () => {
    try {
      await secureFetch('/security/preferences', { onboardingComplete: true });
      setOnboardingVisible(false);
      preferencesQuery.refetch();
      toast.show({ title: 'Let’s move', description: 'Shortcuts saved for quick access.', tone: 'security' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update preferences';
      toast.show({ title: 'Something went wrong', description: message, tone: 'security' });
    }
  }, [preferencesQuery, secureFetch, toast]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([modulesQuery.refetch(), incidentsQuery.refetch(), preferencesQuery.refetch()]);
    setRefreshing(false);
    toast.show({ title: 'Synced', description: 'Fetched latest modules, incidents, preferences.', tone: 'security' });
  }, [incidentsQuery, modulesQuery, preferencesQuery, toast]);

  const secureTasks = useMemo<Array<SecurityTask & { incidentTitle: string }>>(
    () => incidents.flatMap((incident) => incident.tasks.map((task) => ({ ...task, incidentTitle: incident.title }))),
    [incidents],
  );

  const progressSparkData = useMemo(
    () =>
      modules.map((module, index) => ({
        label: module.title.split(' ')[0],
        value: module.progress?.completedLessons.length ?? 0,
        meta: index,
      })),
    [modules],
  );

  const tabRows: Record<TabId, JSX.Element> = useMemo(
    () => ({
      modules: (
        <View style={styles.sectionGap}>
          <SectionCard tone="security" elevation="soft">
            <Text style={styles.sectionTitle}>Learning modules</Text>
            <Text style={styles.sectionSubtitle}>
              Vibe coding blends instinct and heuristics. Lessons sharpen your eye, challenges pressure-test it.
            </Text>
            {modulesQuery.status === 'loading' ? (
              <ActivityIndicator color="#38bdf8" />
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.moduleRow}>
                {modules.map((module) => {
                  const completedLessons = module.progress?.completedLessons.length ?? 0;
                  const totalLessons = module.lessons.length || 1;
                  const ratio = Math.round((completedLessons / totalLessons) * 100);
                  return (
                    <Pressable
                      key={module.id}
                      onPress={() => {
                        setSelectedModuleId(module.id);
                        setSelectedChallengeId(module.challenges[0]?.id ?? null);
                      }}
                      style={({ pressed }) => [
                        styles.moduleCard,
                        selectedModuleId === module.id && styles.moduleCardActive,
                        pressed && styles.moduleCardPressed,
                      ]}
                    >
                      <Text style={styles.moduleTitle}>{module.title}</Text>
                      <Text style={styles.moduleDifficulty}>{module.difficulty}</Text>
                      <Text style={styles.moduleSummary}>{module.summary}</Text>
                      <View style={styles.topicRow}>
                        {module.topics.slice(0, 3).map((topic) => (
                          <Text key={topic} style={styles.topicBadge}>
                            {topic}
                          </Text>
                        ))}
                      </View>
                      <Text style={styles.moduleProgressLabel}>{ratio}% complete</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            )}
            {selectedModule ? (
              <View style={styles.modulesDetail}>
                <Text style={styles.detailTitle}>Lesson outline</Text>
                {selectedModule.lessons.map((lesson) => {
                  const isComplete = selectedModule.progress?.completedLessons.includes(lesson.id);
                  return (
                    <Pressable
                      key={lesson.id}
                      onPress={() => toggleLessonCompletion(lesson.id)}
                      style={({ pressed }) => [
                        styles.lessonCard,
                        isComplete && styles.lessonCardComplete,
                        pressed && styles.lessonCardPressed,
                      ]}
                    >
                      <Text style={styles.lessonTitle}>{lesson.title}</Text>
                      <Text style={styles.lessonBody}>{lesson.content}</Text>
                      <Text style={styles.lessonToggle}>{isComplete ? 'Mark as incomplete' : 'Mark as complete'}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </SectionCard>
        </View>
      ),
      lab: (
        <View style={styles.sectionGap}>
          <SectionCard tone="security" elevation="soft">
            <Text style={styles.sectionTitle}>Vibe coding lab</Text>
            <Text style={styles.sectionSubtitle}>
              Paste suspicious markup, run heuristics, and record whether your gut matched the signals.
            </Text>
            {selectedModule?.challenges.length ? (
              <View style={styles.challengePicker}>
                {selectedModule.challenges.map((challenge) => (
                  <Pressable
                    key={challenge.id}
                    style={[styles.challengePill, selectedChallengeId === challenge.id && styles.challengePillActive]}
                    onPress={() => {
                      setSelectedChallengeId(challenge.id);
                      setCodeSample(challenge.snippet);
                      setAnalysisResult(null);
                    }}
                  >
                    <Text style={styles.challengeText}>{challenge.prompt}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
            {selectedChallenge ? (
              <SectionCard tone="security" elevation="none" style={styles.challengeCard}>
                <Text style={styles.challengeHeader}>Challenge brief</Text>
                <Text style={styles.challengeBody}>{selectedChallenge.prompt}</Text>
                <Text style={styles.challengeHeader}>Heuristic hints</Text>
                {selectedChallenge.hints.map((hint) => (
                  <Text key={hint} style={styles.challengeHint}>
                    • {hint}
                  </Text>
                ))}
              </SectionCard>
            ) : null}
            <Text style={styles.inputLabel}>Inspect code</Text>
            <TextInput
              multiline
              textAlignVertical="top"
              value={codeSample}
              onChangeText={setCodeSample}
              style={styles.codeInput}
              placeholder="Paste HTML, JSX, or CSS here…"
              placeholderTextColor="#64748b"
            />
            <Pressable style={styles.primaryButton} onPress={analyzeSnippet} disabled={analysisLoading}>
              {analysisLoading ? (
                <ActivityIndicator color="#0f172a" />
              ) : (
                <Text style={styles.primaryButtonText}>Run vibe scan</Text>
              )}
            </Pressable>
            {analysisResult ? (
              <SectionCard tone="security" elevation="none" style={styles.analysisCard}>
                <Text style={styles.analysisVerdict}>{analysisResult.verdict}</Text>
                <View style={styles.analysisRow}>
                  <Text style={styles.analysisMetric}>Score: {(analysisResult.score * 100).toFixed(0)} / 100</Text>
                  <Text style={styles.analysisMetric}>Lines: {analysisResult.metrics.lineCount}</Text>
                  <Text style={styles.analysisMetric}>
                    Comment density: {(analysisResult.metrics.commentDensity * 100).toFixed(1)}%
                  </Text>
                </View>
                {analysisResult.signals.length ? (
                  <View style={styles.signalList}>
                    {analysisResult.signals.map((signal) => (
                      <Text key={signal} style={styles.signalItem}>
                        • {signal}
                      </Text>
                    ))}
                  </View>
                ) : null}
                {selectedChallenge ? (
                  <View style={styles.challengeActionRow}>
                    <Pressable
                      style={[styles.challengeActionButton, styles.challengeActionButtonFlag]}
                      onPress={() => markChallengeOutcome(selectedChallenge.id, 'flagged')}
                    >
                      <Text style={styles.challengeActionText}>Flagged</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.challengeActionButton, styles.challengeActionButtonClean]}
                      onPress={() => markChallengeOutcome(selectedChallenge.id, 'clean')}
                    >
                      <Text style={styles.challengeActionText}>Looks good</Text>
                    </Pressable>
                  </View>
                ) : null}
              </SectionCard>
            ) : null}

            {analysisHistory.length ? (
              <SectionCard tone="security" elevation="none">
                <Text style={styles.detailTitle}>Recent heuristics</Text>
                {analysisHistory.map((entry, index) => (
                  <Text key={`${entry.verdict}-${index}`} style={styles.historyLine}>
                    {(entry.score * 100).toFixed(0)} / 100 — {entry.verdict}
                  </Text>
                ))}
              </SectionCard>
            ) : null}
          </SectionCard>
        </View>
      ),
      incidents: (
        <View style={styles.sectionGap}>
          <SectionCard tone="security" elevation="soft">
            <Text style={styles.sectionTitle}>Active incidents</Text>
            <Text style={styles.sectionSubtitle}>
              Blend practice with live drills. Use your instincts to close these faster.
            </Text>
            {!token ? (
              <Text style={styles.bodyText}>Sign in to sync the latest incident queue.</Text>
            ) : incidentsQuery.status === 'loading' ? (
              <ActivityIndicator color="#38bdf8" />
            ) : incidents.length === 0 ? (
              <Text style={styles.bodyText}>No active incidents. Keep sharpening your vibe radar.</Text>
            ) : (
              incidents.map((incident) => (
                <SectionCard key={incident.id} tone="security" elevation="none" style={styles.incidentCard}>
                  <Text style={styles.incidentTitle}>
                    {incident.title} <Text style={styles.incidentSeverity}>[{incident.severity}]</Text>
                  </Text>
                  <Text style={styles.incidentStatus}>{incident.status}</Text>
                  <Text style={styles.incidentBody}>{incident.description}</Text>
                  {incident.tasks.length ? (
                    <View style={styles.taskList}>
                      {incident.tasks.map((task) => (
                        <View key={task.id} style={styles.taskItemRow}>
                          <Text style={styles.taskItem}>• {task.title}</Text>
                          <View style={styles.taskActions}>
                            {(['PENDING', 'ACTIVE', 'DONE'] as SecurityTask['status'][]).map((status) => (
                              <Pressable
                                key={status}
                                style={[
                                  styles.taskActionButton,
                                  task.status === status && styles.taskActionButtonActive,
                                ]}
                                onPress={() => handleTaskStatusUpdate(task.id, status)}
                              >
                                <Text style={styles.taskActionText}>{status}</Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </SectionCard>
              ))
            )}
          </SectionCard>
          {secureTasks.length ? (
            <SectionCard tone="security" elevation="none">
              <Text style={styles.detailTitle}>Remediation queue</Text>
              {secureTasks.map((task) => (
                <View key={task.id} style={styles.taskCard}>
                  <Text style={styles.taskTitle}>{task.title}</Text>
                  <Text style={styles.taskIncident}>{task.incidentTitle}</Text>
                  <Text style={styles.taskStatus}>{task.status}</Text>
                  <Text style={styles.taskBody}>{task.details}</Text>
                </View>
              ))}
            </SectionCard>
          ) : null}
        </View>
      ),
    }),
    [handleTaskStatusUpdate, markChallengeOutcome, modules, modulesQuery.status, incidents, incidentsQuery.status, secureTasks, selectedModule, selectedModuleId, selectedChallenge, selectedChallengeId, toggleLessonCompletion, token, analyzeSnippet, analysisLoading, analysisResult, analysisHistory, codeSample],
  );

  return (
    <>
      <ModalSheet
        visible={onboardingVisible}
        tone="security"
        title="Welcome to SecureGuard Sentinel"
        description="Train your vibe coding instincts, then apply them against live incidents."
        onClose={() => setOnboardingVisible(false)}
        actions={[
          {
            id: 'continue',
            label: 'Get started',
            tone: 'security',
            onPress: completeOnboarding,
          },
        ]}
      >
        <Text style={styles.modalBullet}>• Work modules to spot suspicious heuristics faster.</Text>
        <Text style={styles.modalBullet}>• Paste builds into the vibe lab for instant signal checks.</Text>
        <Text style={styles.modalBullet}>• Link the backend to sync progress with real takedowns.</Text>
      </ModalSheet>

      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <GradientLayout tone="security">
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl tintColor="#f8fafc" refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <View style={styles.hero}>
              <View style={styles.heroText}>
                <Text style={styles.eyeBrow}>Vibe Coding Ops Center</Text>
                <Text style={styles.title}>SecureGuard Sentinel</Text>
                <Text style={styles.subtitle}>
                  Detect rushed builds, expose AI-crafted sites, and rehearse takedowns in one command deck.
                </Text>
              </View>
              <SectionCard tone="security" style={styles.personaCard} elevation="soft" padding={16}>
                <View style={styles.personaHeader}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarInitials}>{persona.avatarInitials}</Text>
                  </View>
                  <View style={styles.personaCopy}>
                    <Text style={styles.personaLabel}>Today&apos;s focus</Text>
                    <Text style={styles.personaName}>{persona.name}</Text>
                    <Text style={styles.personaRole}>{persona.role}</Text>
                  </View>
                </View>
                <Text style={styles.personaSummary}>{persona.summary}</Text>
                <NavigationTabs
                  items={[
                    { id: 'modules', label: 'Modules' },
                    { id: 'lab', label: 'Vibe lab' },
                    { id: 'incidents', label: `Incidents (${incidents.length})` },
                  ]}
                  activeId={activeTab}
                  onChange={(tabId) => setActiveTab(tabId as TabId)}
                />
              </SectionCard>
            </View>

            <View style={styles.statsRow}>
              {identityStats.map((stat) => (
                <StatBadge key={stat.label} tone="security" {...stat} style={styles.statBadge} />
              ))}
            </View>

            <SectionCard tone="security" elevation="soft">
              <SparklineChart
                tone="security"
                title="Lesson completion streak"
                subtitle="Each point reflects lessons cleared per module."
                data={progressSparkData.length ? progressSparkData : [{ label: 'Module', value: 0 }]}
              />
            </SectionCard>

            {!token ? (
              <SectionCard tone="security" elevation="soft" padding={20}>
                <Text style={styles.sectionTitle}>Sign in to sync incidents & takedown playbooks</Text>
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
                  placeholder="email@company.com"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry
                  style={styles.input}
                />
                {mode === 'register' ? (
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Display name"
                    placeholderTextColor="#94a3b8"
                    style={styles.input}
                  />
                ) : null}
                {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
                <Pressable style={styles.primaryButton} onPress={handleAuth} disabled={loadingAuth}>
                  {loadingAuth ? <ActivityIndicator color="#0f172a" /> : <Text style={styles.primaryButtonText}>Continue</Text>}
                </Pressable>
              </SectionCard>
            ) : (
              <SectionCard tone="security" elevation="soft" padding={20}>
                <Text style={styles.sectionTitle}>Connected to Sentinel backend</Text>
                <Text style={styles.sectionSubtitle}>
                  You&apos;re authenticated. Pull fresh incidents, run takedowns, and sync training progress.
                </Text>
                <Pressable style={[styles.primaryButton, styles.logoutButton]} onPress={handleLogout}>
                  <Text style={[styles.primaryButtonText, styles.logoutText]}>Log out</Text>
                </Pressable>
              </SectionCard>
            )}

            <InfoCard
              tone="security"
              title="Identity Exposure Feed"
              subtitle="SecureGuard aggregates every signal tied to VIP and workforce accounts."
            >
              <Text style={styles.bodyText}>
                Stay ahead of off-hours leaks and third-party credential drift while you explore new training modules.
              </Text>
              <Checklist items={securityChecklist} tone="security" />
            </InfoCard>

            <InfoCard
              tone="security"
              title="Rapid Takedown Engine"
              subtitle="Automated requests, partner escalations, and SLA tracking in one view."
              contentStyle={styles.timelineWrapper}
            >
              <Timeline items={securityTakedownTimeline} tone="security" />
            </InfoCard>

            {tabRows[activeTab]}
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
    paddingBottom: 48,
  },
  hero: {
    gap: 24,
  },
  heroText: {
    gap: 12,
  },
  eyeBrow: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    color: palette.security.accent,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: palette.security.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    color: palette.security.textSecondary,
    lineHeight: 22,
  },
  personaCard: {
    backgroundColor: 'rgba(17, 23, 42, 0.5)',
    borderRadius: 20,
    padding: 18,
    flexDirection: 'row',
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  personaHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 999,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 18,
    fontWeight: '700',
    color: palette.security.accent,
  },
  personaCopy: {
    flex: 1,
    gap: 4,
  },
  personaLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: 'rgba(203, 213, 225, 0.8)',
  },
  personaName: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.security.textPrimary,
  },
  personaRole: {
    fontSize: 14,
    color: palette.security.textSecondary,
  },
  personaSummary: {
    fontSize: 13,
    color: 'rgba(226, 232, 240, 0.8)',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
    flexWrap: 'wrap',
  },
  statBadge: {
    flexBasis: '30%',
    flexGrow: 1,
  },
  authCard: {
    backgroundColor: 'rgba(12, 20, 38, 0.75)',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    gap: 14,
  },
  input: {
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.2)',
    color: '#e2e8f0',
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
  },
  primaryButton: {
    backgroundColor: '#38bdf8',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontWeight: '700',
    fontSize: 16,
    color: '#0f172a',
  },
  logoutButton: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  logoutText: {
    color: '#38bdf8',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  toggleText: {
    color: '#e2e8f0',
    fontWeight: '600',
  },
  section: {
    gap: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.15)',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  sectionSubtitle: {
    fontSize: 15,
    color: '#cbd5f5',
    lineHeight: 22,
  },
  bodyText: {
    color: '#cbd5f5',
    lineHeight: 20,
  },
  moduleRow: {
    gap: 16,
    paddingVertical: 4,
  },
  moduleCard: {
    width: 260,
    backgroundColor: 'rgba(12, 31, 54, 0.75)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.1)',
    gap: 8,
  },
  moduleCardActive: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(17, 24, 39, 0.85)',
  },
  moduleCardPressed: {
    opacity: 0.7,
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  moduleDifficulty: {
    color: '#38bdf8',
    fontWeight: '600',
  },
  moduleSummary: {
    color: '#cbd5f5',
    fontSize: 14,
    lineHeight: 20,
  },
  moduleProgressLabel: {
    fontSize: 12,
    color: 'rgba(203, 213, 225, 0.8)',
    marginTop: 8,
  },
  topicRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  topicBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    color: '#38bdf8',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '600',
  },
  modulesDetail: {
    gap: 12,
    paddingTop: 4,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  lessonCard: {
    backgroundColor: 'rgba(15, 29, 47, 0.8)',
    borderRadius: 14,
    padding: 14,
    gap: 6,
  },
  lessonCardComplete: {
    backgroundColor: 'rgba(15, 29, 47, 0.8)',
    borderColor: 'rgba(56, 189, 248, 0.2)',
    borderWidth: 1,
  },
  lessonCardPressed: {
    opacity: 0.7,
  },
  lessonTitle: {
    fontWeight: '600',
    color: '#e2e8f0',
  },
  lessonBody: {
    color: '#cbd5f5',
    lineHeight: 20,
  },
  lessonToggle: {
    fontSize: 12,
    color: 'rgba(203, 213, 225, 0.8)',
    marginTop: 8,
  },
  challengePicker: {
    gap: 10,
  },
  challengePill: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    padding: 12,
    backgroundColor: 'rgba(9, 17, 31, 0.6)',
  },
  challengePillActive: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  challengeText: {
    color: '#e2e8f0',
    fontWeight: '600',
  },
  challengeCard: {
    backgroundColor: 'rgba(12, 25, 41, 0.8)',
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  challengeHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  challengeBody: {
    color: '#cbd5f5',
    lineHeight: 20,
  },
  challengeHint: {
    color: '#94a3b8',
    fontSize: 14,
  },
  inputLabel: {
    color: '#e0f2fe',
    fontWeight: '600',
    fontSize: 14,
  },
  codeInput: {
    minHeight: 150,
    backgroundColor: 'rgba(6, 12, 24, 0.9)',
    color: '#f8fafc',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
    lineHeight: 20,
  },
  analysisCard: {
    backgroundColor: 'rgba(8, 19, 34, 0.85)',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.2)',
  },
  analysisVerdict: {
    fontSize: 16,
    fontWeight: '700',
    color: '#e0f2fe',
  },
  analysisRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  analysisMetric: {
    color: '#bae6fd',
    fontWeight: '600',
  },
  signalList: {
    gap: 6,
  },
  signalItem: {
    color: '#94a3b8',
  },
  errorText: {
    color: '#f87171',
    fontWeight: '600',
  },
  incidentCard: {
    backgroundColor: 'rgba(12, 25, 43, 0.8)',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.2)',
  },
  incidentTitle: {
    color: '#f8fafc',
    fontWeight: '700',
    fontSize: 18,
  },
  incidentSeverity: {
    color: '#f87171',
    fontSize: 14,
  },
  incidentStatus: {
    color: '#fb7185',
    fontWeight: '600',
  },
  incidentBody: {
    color: '#cbd5f5',
    lineHeight: 20,
  },
  taskList: {
    gap: 6,
  },
  taskItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(94, 234, 212, 0.2)',
    gap: 8,
  },
  taskItem: {
    color: '#e2e8f0',
    fontWeight: '600',
  },
  taskActions: {
    flexDirection: 'row',
    gap: 8,
  },
  taskActionButton: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  taskActionButtonActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.25)',
    borderColor: 'rgba(56, 189, 248, 0.5)',
  },
  taskActionText: {
    color: '#38bdf8',
    fontWeight: '600',
    fontSize: 14,
  },
  taskCard: {
    backgroundColor: 'rgba(12, 25, 43, 0.8)',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.2)',
  },
  taskTitle: {
    color: '#e2e8f0',
    fontWeight: '600',
  },
  taskIncident: {
    color: '#94a3b8',
    fontSize: 14,
  },
  taskStatus: {
    color: '#fbbf24',
    fontWeight: '600',
  },
  taskBody: {
    color: '#94a3b8',
  },
  taskDoneButton: {
    color: '#38bdf8',
    fontWeight: '600',
    fontSize: 14,
  },
  sectionTitleSmall: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  bodySmall: {
    color: '#cbd5f5',
  },
  timelineWrapper: {
    paddingTop: 4,
  },
  actionRow: {
    gap: 14,
  },
  actionPill: {
    backgroundColor: palette.security.backdrop,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.security.faint,
    gap: 4,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: palette.security.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  actionText: {
    fontSize: 15,
    color: palette.security.textSecondary,
    lineHeight: 21,
  },
  challengeActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  challengeActionButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeActionButtonFlag: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderWidth: 1,
  },
  challengeActionButtonClean: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderWidth: 1,
  },
  challengeActionText: {
    color: '#e2e8f0',
    fontWeight: '600',
    fontSize: 14,
  },
  sectionGap: {
    gap: 20,
    paddingBottom: 16,
  },
  modalBullet: {
    color: '#cbd5f5',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  historyLine: {
    color: '#cbd5f5',
    fontSize: 14,
    lineHeight: 20,
  },
});
