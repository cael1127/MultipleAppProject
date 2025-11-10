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
  GradientLayout,
  ModalSheet,
  NavigationTabs,
  SectionCard,
  SparklineChart,
  StatBadge,
  Timeline,
  ToastProvider,
  automationTimeline,
  palette,
  personas,
  useApi,
  useToast,
} from '@multiapps/common';

type WorkflowStep = {
  id: string;
  kind: 'TRIGGER' | 'DECISION' | 'ACTION' | 'NOTIFY';
  position: number;
  config: Record<string, unknown>;
};

type Workflow = {
  id: string;
  name: string;
  description: string;
  visibility: string;
  steps: WorkflowStep[];
};

type WorkflowResponse = { workflows: Workflow[] };

type VoiceLog = {
  id: string;
  title: string;
  transcript: string;
  createdAt: string;
};

type VoiceLogsResponse = { voiceLogs: VoiceLog[] };

type GuardrailSimulation = {
  prompt: string;
  guardrails: string[];
  verdict: string;
  confidence: number;
  notes: string[];
};

type SuggestionsResponse = {
  suggestions: Array<{
    id: string;
    title: string;
    description: string;
    steps: string[];
  }>;
};

type TabId = 'studio' | 'voice' | 'guardrails';

type VoiceForm = {
  title: string;
  transcript: string;
  tags: string;
};

type GuardrailForm = {
  prompt: string;
  guardrails: string;
};

const defaultVoiceForm: VoiceForm = {
  title: '',
  transcript: '',
  tags: '',
};

const defaultGuardrailForm: GuardrailForm = {
  prompt: 'Summarize voice capsule for onboarding without mentioning internal dashboards.',
  guardrails: 'marketing-style,review-handoff',
};

export default function App() {
  return (
    <ToastProvider>
      <NovaExperience />
    </ToastProvider>
  );
}

function NovaExperience() {
  const toast = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('operator@example.com');
  const [password, setPassword] = useState('password123');
  const [displayName, setDisplayName] = useState('Operator');
  const [activeTab, setActiveTab] = useState<TabId>('studio');
  const [refreshing, setRefreshing] = useState(false);
  const [voiceForm, setVoiceForm] = useState<VoiceForm>(defaultVoiceForm);
  const [guardrailForm, setGuardrailForm] = useState<GuardrailForm>(defaultGuardrailForm);
  const [guardrailResult, setGuardrailResult] = useState<GuardrailSimulation | null>(null);
  const [onboardingVisible, setOnboardingVisible] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY).then((value) => {
      if (value) {
        setToken(value);
      }
    });
  }, []);

  const workflowsQuery = useApi<WorkflowResponse>({
    path: '/nova/workflows',
    token,
    skip: !token,
    cacheKey: 'nova.workflows',
  });

  const voiceLogsQuery = useApi<VoiceLogsResponse>({
    path: '/nova/voice-logs',
    token,
    skip: !token,
    cacheKey: 'nova.voiceLogs',
  });

  const suggestionsQuery = useApi<SuggestionsResponse>({
    path: '/nova/workflow-suggestions',
    token,
    skip: !token,
    cacheKey: 'nova.suggestions',
  });

  const workflows = useMemo(() => workflowsQuery.data?.workflows ?? [], [workflowsQuery.data]);
  const voiceLogs = useMemo(() => voiceLogsQuery.data?.voiceLogs ?? [], [voiceLogsQuery.data]);
  const suggestions = useMemo(() => suggestionsQuery.data?.suggestions ?? [], [suggestionsQuery.data]);

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
      toast.show({ title: 'Signed in', description: 'Nova studio synced with backend.', tone: 'ai' });
      workflowsQuery.refetch();
      voiceLogsQuery.refetch();
      suggestionsQuery.refetch();
      setOnboardingVisible(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to authenticate';
      setAuthError(message);
      toast.show({ title: 'Authentication failed', description: message, tone: 'ai' });
    } finally {
      setLoadingAuth(false);
    }
  }, [displayName, email, workflowsQuery, voiceLogsQuery, suggestionsQuery, mode, password, toast]);

  const handleLogout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    toast.show({ title: 'Signed out', description: 'Local Nova session cleared.', tone: 'ai' });
  }, [toast]);

  const handleVoiceSubmit = useCallback(async () => {
    try {
      if (!voiceForm.title || !voiceForm.transcript) {
        toast.show({ title: 'Missing fields', description: 'Add a title and transcript before saving.', tone: 'ai' });
        return;
      }
      const tags = voiceForm.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      await secureFetch('/nova/voice-logs', {
        title: voiceForm.title,
        transcript: voiceForm.transcript,
        tags,
      });
      setVoiceForm(defaultVoiceForm);
      voiceLogsQuery.refetch();
      toast.show({ title: 'Voice capsule saved', description: 'Transcript logged and ready for audits.', tone: 'ai' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save voice capsule';
      toast.show({ title: 'Save failed', description: message, tone: 'ai' });
    }
  }, [secureFetch, voiceForm, voiceLogsQuery, toast]);

  const handleGuardrailSim = useCallback(async () => {
    try {
      const response = await secureFetch('/nova/guardrails/simulate', {
        prompt: guardrailForm.prompt,
        guardrails: guardrailForm.guardrails
          .split(',')
          .map((guardrail) => guardrail.trim())
          .filter(Boolean),
      });
      setGuardrailResult(response as GuardrailSimulation);
      toast.show({ title: 'Simulation complete', description: 'Review guardrail verdict below.', tone: 'ai' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to simulate guardrails';
      toast.show({ title: 'Simulation failed', description: message, tone: 'ai' });
    }
  }, [guardrailForm, secureFetch, toast]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([workflowsQuery.refetch(), voiceLogsQuery.refetch(), suggestionsQuery.refetch()]);
    setRefreshing(false);
    toast.show({ title: 'Synced', description: 'Fetched workflows, voice logs, and suggestions.', tone: 'ai' });
  }, [workflowsQuery, voiceLogsQuery, suggestionsQuery, toast]);

  const tabContent: Record<TabId, JSX.Element> = useMemo(
    () => ({
      studio: (
        <View style={styles.sectionGap}>
          <SectionCard tone="ai" elevation="soft">
            <Text style={styles.sectionTitle}>Workflow builder</Text>
            <Text style={styles.sectionSubtitle}>
              Drag actions, votes, and notifications into play. Every node records config history for audits.
            </Text>
            {workflowsQuery.status === 'loading' ? (
              <ActivityIndicator color="#a855f7" />
            ) : workflows.length === 0 ? (
              <Text style={styles.bodyText}>No workflows yet. Use the suggestions below to seed your studio.</Text>
            ) : (
              workflows.map((workflow) => (
                <SectionCard key={workflow.id} tone="ai" elevation="none" style={styles.workflowCard}>
                  <Text style={styles.workflowTitle}>{workflow.name}</Text>
                  <Text style={styles.workflowDescription}>{workflow.description}</Text>
                  <View style={styles.workflowSteps}>
                    {workflow.steps
                      .slice()
                      .sort((a, b) => a.position - b.position)
                      .map((step) => (
                        <View key={step.id} style={styles.stepPill}>
                          <Text style={styles.stepLabel}>{step.kind}</Text>
                          <Text style={styles.stepMeta}>{Object.keys(step.config).join(', ') || 'No config'}</Text>
                        </View>
                      ))}
                  </View>
                </SectionCard>
              ))
            )}
          </SectionCard>
          <SectionCard tone="ai" elevation="none">
            <Text style={styles.detailTitle}>Smart suggestions</Text>
            {suggestionsQuery.status === 'loading' ? (
              <ActivityIndicator color="#a855f7" />
            ) : (
              suggestions.map((suggestion) => (
                <View key={suggestion.id} style={styles.suggestionCard}>
                  <View style={styles.suggestionHeader}>
                    <Text style={styles.suggestionTitle}>{suggestion.title}</Text>
                    <Pressable
                      style={styles.suggestionButton}
                      onPress={() => toast.show({
                        title: 'Suggestion copied',
                        description: `${suggestion.title} steps ready for blueprinting`,
                        tone: 'ai',
                      })}
                    >
                      <Text style={styles.suggestionButtonText}>Copy steps</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.suggestionBody}>{suggestion.description}</Text>
                  <View style={styles.suggestionSteps}>
                    {suggestion.steps.map((step) => (
                      <Text key={step} style={styles.suggestionStepItem}>
                        • {step}
                      </Text>
                    ))}
                  </View>
                </View>
              ))
            )}
          </SectionCard>
        </View>
      ),
      voice: (
        <View style={styles.sectionGap}>
          <SectionCard tone="ai" elevation="soft">
            <Text style={styles.sectionTitle}>Voice capsule logger</Text>
            <Text style={styles.sectionSubtitle}>
              Capture Nova conversations. Tag transcripts and push them to audit trails.
            </Text>
            <TextInput
              value={voiceForm.title}
              onChangeText={(value) => setVoiceForm((prev) => ({ ...prev, title: value }))}
              placeholder="Capsule title"
              placeholderTextColor="#a5b4fc"
              style={styles.input}
            />
            <TextInput
              multiline
              value={voiceForm.transcript}
              onChangeText={(value) => setVoiceForm((prev) => ({ ...prev, transcript: value }))}
              placeholder="Transcript"
              placeholderTextColor="#a5b4fc"
              style={[styles.input, styles.voiceInput]}
            />
            <TextInput
              value={voiceForm.tags}
              onChangeText={(value) => setVoiceForm((prev) => ({ ...prev, tags: value }))}
              placeholder="Tags (comma separated)"
              placeholderTextColor="#a5b4fc"
              style={styles.input}
            />
            <Pressable style={styles.primaryButton} onPress={handleVoiceSubmit}>
              <Text style={styles.primaryButtonText}>Save capsule</Text>
            </Pressable>
          </SectionCard>
          <SectionCard tone="ai" elevation="none">
            <Text style={styles.sectionTitleSmall}>Recent capsules</Text>
            {voiceLogsQuery.status === 'loading' ? (
              <ActivityIndicator color="#a855f7" />
            ) : voiceLogs.length === 0 ? (
              <Text style={styles.bodyText}>No saved voice capsules yet. Start by logging one above.</Text>
            ) : (
              voiceLogs.map((log) => (
                <View key={log.id} style={styles.voiceCard}>
                  <Text style={styles.voiceTitle}>{log.title}</Text>
                  <Text style={styles.voiceTimestamp}>{new Date(log.createdAt).toLocaleString()}</Text>
                  <Text style={styles.voiceTranscript}>{log.transcript}</Text>
                </View>
              ))
            )}
          </SectionCard>
        </View>
      ),
      guardrails: (
        <View style={styles.sectionGap}>
          <SectionCard tone="ai" elevation="soft">
            <Text style={styles.sectionTitle}>Guardrail simulator</Text>
            <Text style={styles.sectionSubtitle}>
              Stress-test automations before they land in the wild. Tune prompts, guardrails, and review thresholds.
            </Text>
            <TextInput
              multiline
              value={guardrailForm.prompt}
              onChangeText={(value) => setGuardrailForm((prev) => ({ ...prev, prompt: value }))}
              placeholder="Prompt to evaluate"
              placeholderTextColor="#a5b4fc"
              style={[styles.input, styles.voiceInput]}
            />
            <TextInput
              value={guardrailForm.guardrails}
              onChangeText={(value) => setGuardrailForm((prev) => ({ ...prev, guardrails: value }))}
              placeholder="Guardrails (comma separated)"
              placeholderTextColor="#a5b4fc"
              style={styles.input}
            />
            <Pressable style={styles.primaryButton} onPress={handleGuardrailSim}>
              <Text style={styles.primaryButtonText}>Run simulation</Text>
            </Pressable>
            {guardrailResult ? (
              <SectionCard tone="ai" elevation="none" style={styles.guardrailCard}>
                <Text style={styles.guardrailVerdict}>{guardrailResult.verdict}</Text>
                <Text style={styles.guardrailConfidence}>
                  Confidence {Math.round((guardrailResult.confidence ?? 0) * 100)}%
                </Text>
                <Text style={styles.guardrailMeta}>Guardrails: {guardrailResult.guardrails.join(', ') || 'n/a'}</Text>
                {guardrailResult.notes.length ? (
                  <View style={styles.guardrailNotes}>
                    {guardrailResult.notes.map((note) => (
                      <Text key={note} style={styles.guardrailNoteItem}>
                        • {note}
                      </Text>
                    ))}
                  </View>
                ) : null}
              </SectionCard>
            ) : null}
          </SectionCard>
          <SectionCard tone="ai" elevation="none">
            <Text style={styles.sectionTitleSmall}>Launch timeline</Text>
            <Timeline items={automationTimeline} tone="ai" />
          </SectionCard>
        </View>
      ),
    }),
    [handleGuardrailSim, handleVoiceSubmit, suggestions, suggestionsQuery.status, toast, voiceForm, voiceLogs, voiceLogsQuery.status, workflows, workflowsQuery.status, guardrailForm, guardrailResult],
  );

  return (
    <>
      <ModalSheet
        visible={onboardingVisible}
        tone="ai"
        title="Welcome to Nova Control Surface"
        description="Prototype, simulate, and audit automations before they ship."
        onClose={() => setOnboardingVisible(false)}
        actions={[
          {
            id: 'continue',
            label: 'Start building',
            tone: 'ai',
            onPress: () => setOnboardingVisible(false),
          },
        ]}
      >
        <Text style={styles.modalBullet}>• Drag workflows into shape with smart suggestions.</Text>
        <Text style={styles.modalBullet}>• Capture voice capsules and sync transcripts to audit logs.</Text>
        <Text style={styles.modalBullet}>• Run guardrail simulations before launching to production.</Text>
      </ModalSheet>

      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <GradientLayout tone="ai">
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl tintColor="#ede9fe" refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <View style={styles.hero}>
              <View style={styles.heroCopy}>
                <Text style={styles.eyeBrow}>Automation Studio</Text>
                <Text style={styles.title}>Nova Control Surface</Text>
                <Text style={styles.subtitle}>
                  Design voice, chat, and workflow automations that stay grounded in your playbooks.
                </Text>
              </View>
              <SectionCard tone="ai" padding={18} elevation="soft" style={styles.personaCard}>
                <Text style={styles.personaLabel}>Operator in charge</Text>
                <Text style={styles.personaName}>{personas.ai.name}</Text>
                <Text style={styles.personaRole}>{personas.ai.role}</Text>
                <Text style={styles.personaSummary}>{personas.ai.focus}</Text>
                <NavigationTabs
                  items={[
                    { id: 'studio', label: 'Workflow studio' },
                    { id: 'voice', label: 'Voice capsules' },
                    { id: 'guardrails', label: 'Guardrail sim' },
                  ]}
                  activeId={activeTab}
                  onChange={(tabId) => setActiveTab(tabId as TabId)}
                />
              </SectionCard>
            </View>

            <View style={styles.statsRow}>
              {workflowStats.map((stat) => (
                <StatBadge key={stat.label} tone="ai" {...stat} style={styles.statBadge} />
              ))}
            </View>

            {!token ? (
              <SectionCard tone="ai" elevation="soft">
                <Text style={styles.sectionTitle}>Link Nova backend</Text>
                <Text style={styles.sectionSubtitle}>Sign in to sync workflows, voice capsules, and guardrail analytics.</Text>
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
                  placeholder="operator@example.com"
                  placeholderTextColor="#c4b5fd"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="#c4b5fd"
                  secureTextEntry
                  style={styles.input}
                />
                {mode === 'register' ? (
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Display name"
                    placeholderTextColor="#c4b5fd"
                    style={styles.input}
                  />
                ) : null}
                {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
                <Pressable style={styles.primaryButton} onPress={handleAuth} disabled={loadingAuth}>
                  {loadingAuth ? <ActivityIndicator color="#1e1b4b" /> : <Text style={styles.primaryButtonText}>Continue</Text>}
                </Pressable>
              </SectionCard>
            ) : (
              <SectionCard tone="ai" elevation="soft">
                <Text style={styles.sectionTitle}>Synced with Nova cloud</Text>
                <Text style={styles.sectionSubtitle}>Refresh workflows and guardrail analytics on demand.</Text>
                <Pressable style={[styles.primaryButton, styles.logoutButton]} onPress={handleLogout}>
                  <Text style={[styles.primaryButtonText, styles.logoutText]}>Log out</Text>
                </Pressable>
              </SectionCard>
            )}

            <SectionCard tone="ai" elevation="soft">
              <SparklineChart
                tone="ai"
                title="Automation momentum"
                subtitle="Lessons cleared, guardrails tuned, or voice capsules logged per module."
                data={workflows.map((workflow, index) => ({
                  label: workflow.name.split(' ')[0],
                  value: workflow.steps.length,
                  meta: index,
                }))}
              />
            </SectionCard>

            {tabContent[activeTab]}

            <SectionCard tone="ai" elevation="none">
              <Text style={styles.sectionTitleSmall}>Launch timeline</Text>
              <Timeline items={automationTimeline} tone="ai" />
            </SectionCard>
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
    letterSpacing: 1.2,
    color: palette.ai.accent,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: palette.ai.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    color: palette.ai.textSecondary,
    lineHeight: 22,
  },
  personaCard: {
    gap: 14,
  },
  personaLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: 'rgba(220, 215, 255, 0.8)',
  },
  personaName: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.ai.textPrimary,
  },
  personaRole: {
    fontSize: 14,
    color: palette.ai.textSecondary,
  },
  personaSummary: {
    fontSize: 14,
    color: palette.ai.textSecondary,
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
    color: '#ede9fe',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: '#c4b5fd',
    lineHeight: 22,
    marginBottom: 12,
  },
  bodyText: {
    color: '#c4b5fd',
    lineHeight: 20,
  },
  workflowCard: {
    gap: 12,
  },
  workflowTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ede9fe',
  },
  workflowDescription: {
    color: '#c4b5fd',
    lineHeight: 20,
  },
  workflowSteps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  stepPill: {
    backgroundColor: 'rgba(79, 70, 229, 0.25)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  stepLabel: {
    color: '#ede9fe',
    fontWeight: '600',
  },
  stepMeta: {
    color: '#c4b5fd',
    fontSize: 12,
  },
  suggestionCard: {
    backgroundColor: 'rgba(23, 22, 52, 0.8)',
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionTitle: {
    color: '#ede9fe',
    fontSize: 16,
    fontWeight: '600',
  },
  suggestionButton: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  suggestionButtonText: {
    color: '#ede9fe',
    fontWeight: '600',
  },
  suggestionBody: {
    color: '#c4b5fd',
    lineHeight: 20,
  },
  suggestionSteps: {
    gap: 4,
  },
  suggestionStepItem: {
    color: '#c4b5fd',
    fontSize: 14,
  },
  input: {
    backgroundColor: 'rgba(23, 22, 52, 0.75)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.35)',
    color: '#ede9fe',
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
  },
  voiceInput: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: '#a855f7',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  primaryButtonText: {
    fontWeight: '700',
    fontSize: 16,
    color: '#1e1b4b',
  },
  logoutButton: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
  },
  logoutText: {
    color: '#a855f7',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(31, 41, 55, 0.7)',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  toggleText: {
    color: '#ede9fe',
    fontWeight: '600',
  },
  sectionTitleSmall: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ede9fe',
  },
  voiceCard: {
    backgroundColor: 'rgba(23, 22, 52, 0.85)',
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  voiceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ede9fe',
  },
  voiceTimestamp: {
    color: '#c4b5fd',
    fontSize: 12,
  },
  voiceTranscript: {
    color: '#c4b5fd',
    lineHeight: 20,
  },
  guardrailCard: {
    gap: 6,
  },
  guardrailVerdict: {
    color: '#ede9fe',
    fontWeight: '700',
    fontSize: 16,
  },
  guardrailConfidence: {
    color: '#a855f7',
    fontWeight: '600',
  },
  guardrailMeta: {
    color: '#c4b5fd',
    fontSize: 13,
  },
  guardrailNotes: {
    gap: 4,
  },
  guardrailNoteItem: {
    color: '#c4b5fd',
    fontSize: 14,
  },
  modalBullet: {
    color: '#c4b5fd',
    fontSize: 14,
    lineHeight: 20,
  },
});
