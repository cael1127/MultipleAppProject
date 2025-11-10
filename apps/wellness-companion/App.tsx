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
  useApi,
  useToast,
  wellnessJournalingPrompts,
  wellnessRecoveryTimeline,
} from '@multiapps/common';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
const TOKEN_KEY = 'bloom-token';
const persona = personas.wellness;

type EnergySnapshot = {
  id: string;
  recordedAt: string;
  readiness: number;
  sleepHours: number;
  hrvScore: number;
  tags: string[];
};

type JournalEntry = {
  id: string;
  content: string;
  mood: number;
  createdAt: string;
};

type SnapshotsResponse = { snapshots: EnergySnapshot[] };
type JournalResponse = { entries: JournalEntry[] };

type SnapshotFormState = {
  recordedAt: string;
  readiness: string;
  sleepHours: string;
  hrvScore: string;
  tags: string;
};

type JournalFormState = {
  content: string;
  mood: string;
};

type TabId = 'dashboard' | 'journal' | 'programs';

const defaultSnapshotForm: SnapshotFormState = {
  recordedAt: new Date().toISOString(),
  readiness: '82',
  sleepHours: '7.2',
  hrvScore: '68',
  tags: 'travel,deep-work',
};

const defaultJournalForm: JournalFormState = {
  content: '',
  mood: '4',
};

export default function App() {
  return (
    <ToastProvider>
      <BloomExperience />
    </ToastProvider>
  );
}

function BloomExperience() {
  const toast = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('lina@example.com');
  const [password, setPassword] = useState('password123');
  const [displayName, setDisplayName] = useState('Lina');
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [refreshing, setRefreshing] = useState(false);
  const [snapshotForm, setSnapshotForm] = useState<SnapshotFormState>(defaultSnapshotForm);
  const [journalForm, setJournalForm] = useState<JournalFormState>(defaultJournalForm);
  const [onboardingVisible, setOnboardingVisible] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY).then((value) => {
      if (value) {
        setToken(value);
      }
    });
  }, []);

  const snapshotsQuery = useApi<SnapshotsResponse>({
    path: '/wellness/snapshots',
    token,
    skip: !token,
    cacheKey: 'wellness.snapshots',
  });

  const journalQuery = useApi<JournalResponse>({
    path: '/wellness/journal',
    token,
    skip: !token,
    cacheKey: 'wellness.journal',
  });

  const snapshots = useMemo(() => snapshotsQuery.data?.snapshots ?? [], [snapshotsQuery.data]);
  const journalEntries = useMemo(() => journalQuery.data?.entries ?? [], [journalQuery.data]);

  const secureFetch = useCallback(
    async (path: string, body: Record<string, unknown>) => {
      if (!token) {
        throw new Error('Authentication required');
      }
      const response = await fetch(`${API_URL}${path}`, {
        method: 'POST',
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
      toast.show({ title: 'Signed in', description: 'Bloom synced with your wellness backend.', tone: 'wellness' });
      snapshotsQuery.refetch();
      journalQuery.refetch();
      setOnboardingVisible(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to authenticate';
      setAuthError(message);
      toast.show({ title: 'Authentication failed', description: message, tone: 'wellness' });
    } finally {
      setLoadingAuth(false);
    }
  }, [displayName, email, journalQuery, mode, password, snapshotsQuery, toast]);

  const handleLogout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    toast.show({ title: 'Signed out', description: 'Bloom session cleared.', tone: 'wellness' });
  }, [toast]);

  const handleSnapshotSubmit = useCallback(async () => {
    try {
      const readiness = Number(snapshotForm.readiness);
      const sleepHours = Number(snapshotForm.sleepHours);
      const hrvScore = Number(snapshotForm.hrvScore);
      if (Number.isNaN(readiness) || Number.isNaN(sleepHours) || Number.isNaN(hrvScore)) {
        toast.show({ title: 'Invalid values', description: 'Check readiness, sleep, and HRV fields.', tone: 'wellness' });
        return;
      }
      const tags = snapshotForm.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);
      await secureFetch('/wellness/snapshots', {
        recordedAt: snapshotForm.recordedAt,
        readiness,
        sleepHours,
        hrvScore,
        tags,
      });
      snapshotsQuery.refetch();
      toast.show({ title: 'Snapshot saved', description: 'Energy metrics updated.', tone: 'wellness' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save snapshot';
      toast.show({ title: 'Save failed', description: message, tone: 'wellness' });
    }
  }, [secureFetch, snapshotForm, snapshotsQuery, toast]);

  const handleJournalSubmit = useCallback(async () => {
    try {
      if (!journalForm.content.trim()) {
        toast.show({ title: 'Missing reflection', description: 'Write a short note before saving.', tone: 'wellness' });
        return;
      }
      const mood = Number(journalForm.mood);
      if (Number.isNaN(mood) || mood < 1 || mood > 5) {
        toast.show({ title: 'Mood out of range', description: 'Mood should be between 1 and 5.', tone: 'wellness' });
        return;
      }
      await secureFetch('/wellness/journal', {
        content: journalForm.content,
        mood,
      });
      setJournalForm(defaultJournalForm);
      journalQuery.refetch();
      toast.show({ title: 'Journal saved', description: 'Reflection added to your log.', tone: 'wellness' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save journal entry';
      toast.show({ title: 'Save failed', description: message, tone: 'wellness' });
    }
  }, [journalForm, journalQuery, secureFetch, toast]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([snapshotsQuery.refetch(), journalQuery.refetch()]);
    setRefreshing(false);
    toast.show({ title: 'Synced', description: 'Latest readiness metrics and journal entries loaded.', tone: 'wellness' });
  }, [journalQuery, snapshotsQuery, toast]);

  const readinessSpark = useMemo(() => {
    if (!snapshots.length) {
      return [{ label: 'Mon', value: 60 }];
    }
    return snapshots
      .slice(0, 14)
      .reverse()
      .map((snapshot) => ({
        label: new Date(snapshot.recordedAt).toLocaleDateString(undefined, { weekday: 'short' }),
        value: snapshot.readiness,
      }));
  }, [snapshots]);

  const focusSpark = useMemo(() => {
    const filtered = snapshots
      .filter((snapshot) => snapshot.tags.some((tag) => tag === 'travel' || tag === 'deep-work'))
      .slice(0, 10)
      .reverse()
      .map((snapshot) => ({
        label: new Date(snapshot.recordedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        value: snapshot.readiness,
      }));
    return filtered.length ? filtered : [{ label: 'Today', value: 55 }];
  }, [snapshots]);

  const latestSnapshot = snapshots[0];

  const energyStats = useMemo(
    () => [
      {
        label: 'Recovery score',
        value: latestSnapshot ? String(latestSnapshot.readiness) : '—',
        delta: latestSnapshot ? new Date(latestSnapshot.recordedAt).toLocaleDateString() : 'Add a snapshot',
        trend: latestSnapshot && latestSnapshot.readiness >= 70 ? ('up' as const) : ('steady' as const),
      },
      {
        label: 'Sleep debt',
        value: latestSnapshot
          ? `${latestSnapshot.sleepHours - 7 >= 0 ? '+' : ''}${(latestSnapshot.sleepHours - 7).toFixed(1)}h`
          : '—',
        delta: 'Target 7h',
        trend:
          latestSnapshot && latestSnapshot.sleepHours - 7 <= 0 ? ('down' as const) : ('steady' as const),
      },
      {
        label: 'HRV score',
        value: latestSnapshot ? `${latestSnapshot.hrvScore}` : '—',
        delta: 'Higher is better',
        trend: latestSnapshot && latestSnapshot.hrvScore >= 60 ? ('up' as const) : ('steady' as const),
      },
    ],
    [latestSnapshot],
  );

  const tabContent: Record<TabId, JSX.Element> = useMemo(
    () => ({
      dashboard: (
        <View style={styles.sectionGap}>
          <SectionCard tone="wellness" elevation="soft">
            <Text style={styles.sectionTitle}>Daily energy loop</Text>
            <Text style={styles.sectionSubtitle}>
              Balance recovery, sleep, and focus rituals. Track tags to see what fuels or drains you.
            </Text>
            <SparklineChart
              tone="wellness"
              title="Readiness trend"
              subtitle="Trailing two-week recovery snapshot"
              data={readinessSpark}
            />
          </SectionCard>
          <SectionCard tone="wellness" elevation="none">
            <Text style={styles.sectionTitleSmall}>Micro-resets</Text>
            <Checklist items={wellnessJournalingPrompts} tone="wellness" />
          </SectionCard>
          <SectionCard tone="wellness" elevation="none">
            <Text style={styles.sectionTitleSmall}>Recovery timeline</Text>
            <Timeline items={wellnessRecoveryTimeline} tone="wellness" />
          </SectionCard>
        </View>
      ),
      journal: (
        <View style={styles.sectionGap}>
          <SectionCard tone="wellness" elevation="soft">
            <Text style={styles.sectionTitle}>Log today&apos;s reflection</Text>
            <Text style={styles.sectionSubtitle}>
              Capture gratitude, blockers, or energy wins. Bloom uses entries to personalize tomorrow&apos;s plan.
            </Text>
            <TextInput
              multiline
              value={journalForm.content}
              onChangeText={(value) => setJournalForm((prev) => ({ ...prev, content: value }))}
              placeholder="What gave you energy today?"
              placeholderTextColor="#f59e99"
              style={[styles.input, styles.textArea]}
            />
            <TextInput
              value={journalForm.mood}
              onChangeText={(value) => setJournalForm((prev) => ({ ...prev, mood: value }))}
              placeholder="Mood (1-5)"
              placeholderTextColor="#f59e99"
              keyboardType="numeric"
              style={styles.input}
            />
            <Pressable style={styles.primaryButton} onPress={handleJournalSubmit}>
              <Text style={styles.primaryButtonText}>Save reflection</Text>
            </Pressable>
          </SectionCard>
          <SectionCard tone="wellness" elevation="none">
            <Text style={styles.sectionTitleSmall}>Recent journal</Text>
            {journalQuery.status === 'loading' ? (
              <ActivityIndicator color="#ec4899" />
            ) : journalEntries.length === 0 ? (
              <Text style={styles.bodyText}>No journal entries yet. Start with a quick reflection above.</Text>
            ) : (
              journalEntries.map((entry) => (
                <View key={entry.id} style={styles.journalCard}>
                  <Text style={styles.journalTimestamp}>{new Date(entry.createdAt).toLocaleString()}</Text>
                  <Text style={styles.journalMood}>Mood {entry.mood}/5</Text>
                  <Text style={styles.journalContent}>{entry.content}</Text>
                </View>
              ))
            )}
          </SectionCard>
        </View>
      ),
      programs: (
        <View style={styles.sectionGap}>
          <SectionCard tone="wellness" elevation="soft">
            <Text style={styles.sectionTitle}>Log a wearable snapshot</Text>
            <Text style={styles.sectionSubtitle}>Drop in readiness, sleep, HRV, and tags from your device sync.</Text>
            <TextInput
              value={snapshotForm.recordedAt}
              onChangeText={(value) => setSnapshotForm((prev) => ({ ...prev, recordedAt: value }))}
              placeholder="Recorded at (ISO)"
              placeholderTextColor="#f59e99"
              style={styles.input}
            />
            <TextInput
              value={snapshotForm.readiness}
              onChangeText={(value) => setSnapshotForm((prev) => ({ ...prev, readiness: value }))}
              placeholder="Readiness score"
              placeholderTextColor="#f59e99"
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              value={snapshotForm.sleepHours}
              onChangeText={(value) => setSnapshotForm((prev) => ({ ...prev, sleepHours: value }))}
              placeholder="Sleep hours"
              placeholderTextColor="#f59e99"
              keyboardType="decimal-pad"
              style={styles.input}
            />
            <TextInput
              value={snapshotForm.hrvScore}
              onChangeText={(value) => setSnapshotForm((prev) => ({ ...prev, hrvScore: value }))}
              placeholder="HRV score"
              placeholderTextColor="#f59e99"
              keyboardType="numeric"
              style={styles.input}
            />
            <TextInput
              value={snapshotForm.tags}
              onChangeText={(value) => setSnapshotForm((prev) => ({ ...prev, tags: value }))}
              placeholder="Tags (comma separated)"
              placeholderTextColor="#f59e99"
              style={styles.input}
            />
            <Pressable style={styles.primaryButton} onPress={handleSnapshotSubmit}>
              <Text style={styles.primaryButtonText}>Save snapshot</Text>
            </Pressable>
          </SectionCard>
          <SectionCard tone="wellness" elevation="none">
            <Text style={styles.sectionTitleSmall}>Recovery timeline</Text>
            <Timeline items={wellnessRecoveryTimeline} tone="wellness" />
          </SectionCard>
        </View>
      ),
    }),
    [handleJournalSubmit, handleSnapshotSubmit, journalEntries, journalForm, journalQuery.status, readinessSpark, snapshotForm],
  );

  return (
    <>
      <ModalSheet
        visible={onboardingVisible}
        tone="wellness"
        title="Welcome to Bloom Daily Edition"
        description="Sync wearables, log reflections, and stay ahead of burnout with adaptive rituals."
        onClose={() => setOnboardingVisible(false)}
        actions={[
          {
            id: 'continue',
            label: 'Start coaching',
            tone: 'wellness',
            onPress: () => setOnboardingVisible(false),
          },
        ]}
      >
        <Text style={styles.modalBullet}>• Log your latest readiness snapshot to unlock personalized rituals.</Text>
        <Text style={styles.modalBullet}>• Capture a daily reflection to recalibrate tomorrow&apos;s plan.</Text>
        <Text style={styles.modalBullet}>• Explore micro-resets and recovery timelines tailored to your tags.</Text>
      </ModalSheet>

      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <GradientLayout tone="wellness">
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl tintColor="#893657" refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <View style={styles.hero}>
              <View style={styles.heroCopy}>
                <Text style={styles.eyeBrow}>Adaptive Energy Coach</Text>
                <Text style={styles.title}>Bloom Daily Edition</Text>
                <Text style={styles.subtitle}>
                  Translate your wearable data into rituals that protect your energy across time zones.
                </Text>
              </View>
              <SectionCard tone="wellness" padding={18} elevation="soft" style={styles.personaCard}>
                <Text style={styles.personaLabel}>Member spotlight</Text>
                <Text style={styles.personaName}>{persona.name}</Text>
                <Text style={styles.personaRole}>{persona.role}</Text>
                <Text style={styles.personaSummary}>{persona.summary}</Text>
                <NavigationTabs
                  items={[
                    { id: 'dashboard', label: 'Dashboard' },
                    { id: 'journal', label: `Journal (${journalEntries.length})` },
                    { id: 'programs', label: 'Programs' },
                  ]}
                  activeId={activeTab}
                  onChange={(tabId) => setActiveTab(tabId as TabId)}
                />
              </SectionCard>
            </View>

            <View style={styles.statsRow}>
              {energyStats.map((stat) => (
                <StatBadge key={stat.label} tone="wellness" {...stat} style={styles.statBadge} />
              ))}
            </View>

            {!token ? (
              <SectionCard tone="wellness" elevation="soft">
                <Text style={styles.sectionTitle}>Link Bloom backend</Text>
                <Text style={styles.sectionSubtitle}>
                  Sign in to sync wearable snapshots, journaling streaks, and recovery trends.
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
                  placeholder="lina@example.com"
                  placeholderTextColor="#f9a8d4"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="#f9a8d4"
                  secureTextEntry
                  style={styles.input}
                />
                {mode === 'register' ? (
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Display name"
                    placeholderTextColor="#f9a8d4"
                    style={styles.input}
                  />
                ) : null}
                {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
                <Pressable style={styles.primaryButton} onPress={handleAuth} disabled={loadingAuth}>
                  {loadingAuth ? <ActivityIndicator color="#7f1d1d" /> : <Text style={styles.primaryButtonText}>Continue</Text>}
                </Pressable>
              </SectionCard>
            ) : (
              <SectionCard tone="wellness" elevation="soft">
                <Text style={styles.sectionTitle}>Synced with Bloom cloud</Text>
                <Text style={styles.sectionSubtitle}>Refresh data to pull the latest snapshots and reflections.</Text>
                <Pressable style={[styles.primaryButton, styles.logoutButton]} onPress={handleLogout}>
                  <Text style={[styles.primaryButtonText, styles.logoutText]}>Log out</Text>
                </Pressable>
              </SectionCard>
            )}

            <SectionCard tone="wellness" elevation="soft">
              <SparklineChart
                tone="wellness"
                title="Focus streak"
                subtitle="Snapshots tagged with deep-work or travel"
                data={focusSpark}
              />
            </SectionCard>

            {tabContent[activeTab]}
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
    color: palette.wellness.accent,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: palette.wellness.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    color: palette.wellness.textSecondary,
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
    color: '#aa6f9f',
  },
  personaName: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.wellness.textPrimary,
  },
  personaRole: {
    fontSize: 14,
    color: palette.wellness.textSecondary,
  },
  personaSummary: {
    fontSize: 14,
    color: '#704f7b',
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
    color: '#572f58',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: '#a85588',
    lineHeight: 22,
    marginBottom: 12,
  },
  sectionTitleSmall: {
    fontSize: 18,
    fontWeight: '600',
    color: '#572f58',
  },
  bodyText: {
    color: '#a85588',
    lineHeight: 20,
  },
  input: {
    backgroundColor: 'rgba(255, 247, 236, 0.85)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.25)',
    color: '#572f58',
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
    marginTop: 8,
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: 'top',
  },
  primaryButton: {
    backgroundColor: '#ec4899',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  primaryButtonText: {
    fontWeight: '700',
    fontSize: 16,
    color: '#fff7ec',
  },
  logoutButton: {
    backgroundColor: 'rgba(236, 72, 153, 0.15)',
  },
  logoutText: {
    color: '#ec4899',
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
    backgroundColor: 'rgba(252, 231, 243, 0.6)',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: 'rgba(236, 72, 153, 0.2)',
  },
  toggleText: {
    color: '#7a335f',
    fontWeight: '600',
  },
  journalCard: {
    backgroundColor: 'rgba(255, 247, 236, 0.9)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(236, 72, 153, 0.2)',
    gap: 6,
  },
  journalTimestamp: {
    fontSize: 12,
    color: '#a85588',
  },
  journalMood: {
    color: '#f97316',
    fontWeight: '600',
  },
  journalContent: {
    color: '#704f7b',
    lineHeight: 20,
  },
  modalBullet: {
    color: '#704f7b',
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: '#ec4899',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});