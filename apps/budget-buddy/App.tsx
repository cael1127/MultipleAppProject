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
  financeTimeline,
} from '@multiapps/common';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000';
const TOKEN_KEY = 'ledgerloop-token';
const persona = personas.finance;

type FinanceAccount = {
  id: string;
  name: string;
  type: string;
  currency: string;
  balance: number;
  transactions: Transaction[];
  autopilotRules: AutopilotRule[];
};

type Transaction = {
  id: string;
  description: string;
  amount: number;
  category: string;
  occurredAt: string;
};

type AutopilotRule = {
  id: string;
  name: string;
  percentage: number;
  destination: string;
  active: boolean;
  accountId?: string | null;
};

type AccountsResponse = { accounts: FinanceAccount[] };

type ForecastRow = {
  accountId: string;
  balance: number;
  projected: number;
  horizonDays: number;
  autopilot: number;
};

type ForecastResponse = { forecast: ForecastRow[] };

type TabId = 'overview' | 'autopilot' | 'scenarios';

type AccountFormState = {
  name: string;
  type: string;
  currency: string;
  balance: string;
};

type AutopilotFormState = {
  name: string;
  percentage: string;
  destination: string;
  accountId: string | null;
};

type TransactionFormState = {
  accountId: string | null;
  description: string;
  amount: string;
  category: string;
  occurredAt: string;
};

type ScenarioFormState = {
  horizonDays: string;
};

const defaultAccountForm: AccountFormState = {
  name: 'Creator Checking',
  type: 'CHECKING',
  currency: 'USD',
  balance: '4200',
};

const defaultAutopilotForm: AutopilotFormState = {
  name: 'Creator tax set-aside',
  percentage: '0.22',
  destination: 'High-yield reserve',
  accountId: null,
};

const defaultTransactionForm = (accountId: string | null): TransactionFormState => ({
  accountId,
  description: 'Retainer invoice',
  amount: '1200',
  category: 'Income',
  occurredAt: new Date().toISOString(),
});

const defaultScenarioForm: ScenarioFormState = {
  horizonDays: '60',
};

export default function App() {
  return (
    <ToastProvider>
      <LedgerLoopExperience />
    </ToastProvider>
  );
}

function LedgerLoopExperience() {
  const toast = useToast();
  const [token, setToken] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('founder@example.com');
  const [password, setPassword] = useState('password123');
  const [displayName, setDisplayName] = useState('Founder');
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [refreshing, setRefreshing] = useState(false);
  const [onboardingVisible, setOnboardingVisible] = useState(false);
  const [accountForm, setAccountForm] = useState<AccountFormState>(defaultAccountForm);
  const [autopilotForm, setAutopilotForm] = useState<AutopilotFormState>(defaultAutopilotForm);
  const [transactionForm, setTransactionForm] = useState<TransactionFormState>(defaultTransactionForm(null));
  const [scenarioForm, setScenarioForm] = useState<ScenarioFormState>(defaultScenarioForm);
  const [forecastData, setForecastData] = useState<ForecastRow[] | null>(null);
  const [forecastLoading, setForecastLoading] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(TOKEN_KEY).then((stored) => {
      if (stored) {
        setToken(stored);
      }
    });
  }, []);

  const accountsQuery = useApi<AccountsResponse>({
    path: '/finance/accounts',
    token,
    skip: !token,
    cacheKey: 'finance.accounts',
  });

  const accounts = useMemo(() => accountsQuery.data?.accounts ?? [], [accountsQuery.data]);

  useEffect(() => {
    if (accounts.length && !autopilotForm.accountId) {
      setAutopilotForm((prev) => ({ ...prev, accountId: accounts[0].id }));
    }
    if (accounts.length && !transactionForm.accountId) {
      setTransactionForm(defaultTransactionForm(accounts[0].id));
    }
  }, [accounts, autopilotForm.accountId, transactionForm.accountId]);

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
      toast.show({ title: 'Signed in', description: 'LedgerLoop cloud connected.', tone: 'finance' });
      accountsQuery.refetch();
      setOnboardingVisible(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to authenticate';
      setAuthError(message);
      toast.show({ title: 'Authentication failed', description: message, tone: 'finance' });
    } finally {
      setLoadingAuth(false);
    }
  }, [accountsQuery, displayName, email, mode, password, toast]);

  const handleLogout = useCallback(async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    setToken(null);
    setForecastData(null);
    toast.show({ title: 'Signed out', description: 'Session cleared.', tone: 'finance' });
  }, [toast]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await accountsQuery.refetch();
    setRefreshing(false);
    toast.show({ title: 'Synced', description: 'Refreshed accounts and rules.', tone: 'finance' });
  }, [accountsQuery, toast]);

  const handleAccountSubmit = useCallback(async () => {
    try {
      const balance = Number(accountForm.balance);
      if (!accountForm.name.trim() || Number.isNaN(balance)) {
        toast.show({ title: 'Check account fields', description: 'Name and balance must be valid.', tone: 'finance' });
        return;
      }
      await secureFetch('/finance/accounts', {
        name: accountForm.name,
        type: accountForm.type.toUpperCase(),
        currency: accountForm.currency.toUpperCase(),
        balance,
      });
      setAccountForm(defaultAccountForm);
      accountsQuery.refetch();
      toast.show({ title: 'Account added', description: 'New account ready for forecasting.', tone: 'finance' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to add account';
      toast.show({ title: 'Save failed', description: message, tone: 'finance' });
    }
  }, [accountForm, accountsQuery, secureFetch, toast]);

  const handleAutopilotSubmit = useCallback(async () => {
    try {
      if (!autopilotForm.name.trim()) {
        toast.show({ title: 'Missing name', description: 'Provide an autopilot rule name.', tone: 'finance' });
        return;
      }
      let percentage = Number(autopilotForm.percentage);
      if (Number.isNaN(percentage)) {
        toast.show({ title: 'Invalid percentage', description: 'Percentage must be a number.', tone: 'finance' });
        return;
      }
      if (percentage > 1) {
        percentage = percentage / 100;
      }
      if (percentage <= 0 || percentage > 1) {
        toast.show({ title: 'Out of range', description: 'Percentage should be between 0 and 100.', tone: 'finance' });
        return;
      }
      await secureFetch('/finance/autopilot-rules', {
        accountId: autopilotForm.accountId ?? undefined,
        name: autopilotForm.name,
        percentage,
        destination: autopilotForm.destination,
        active: true,
      });
      accountsQuery.refetch();
      toast.show({ title: 'Autopilot queued', description: 'Rule will run on next payout.', tone: 'finance' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save autopilot rule';
      toast.show({ title: 'Save failed', description: message, tone: 'finance' });
    }
  }, [accountsQuery, autopilotForm, secureFetch, toast]);

  const handleTransactionSubmit = useCallback(async () => {
    try {
      if (!transactionForm.accountId) {
        toast.show({ title: 'Select account', description: 'Choose an account for the transaction.', tone: 'finance' });
        return;
      }
      if (!transactionForm.description.trim()) {
        toast.show({ title: 'Missing description', description: 'Describe the transaction.', tone: 'finance' });
        return;
      }
      const amount = Number(transactionForm.amount);
      if (Number.isNaN(amount) || amount === 0) {
        toast.show({ title: 'Amount invalid', description: 'Enter a non-zero amount.', tone: 'finance' });
        return;
      }
      await secureFetch('/finance/transactions', {
        accountId: transactionForm.accountId,
        description: transactionForm.description,
        amount,
        category: transactionForm.category,
        occurredAt: transactionForm.occurredAt,
      });
      accountsQuery.refetch();
      toast.show({ title: 'Transaction logged', description: 'Cashflow updated.', tone: 'finance' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to log transaction';
      toast.show({ title: 'Save failed', description: message, tone: 'finance' });
    }
  }, [accountsQuery, secureFetch, toast, transactionForm]);

  const handleForecast = useCallback(async () => {
    try {
      if (!scenarioForm.horizonDays.trim()) {
        toast.show({ title: 'Horizon missing', description: 'Pick a forecast window.', tone: 'finance' });
        return;
      }
      const horizonDays = Number(scenarioForm.horizonDays);
      if (Number.isNaN(horizonDays) || horizonDays <= 0) {
        toast.show({ title: 'Invalid horizon', description: 'Use a positive number of days.', tone: 'finance' });
        return;
      }
      setForecastLoading(true);
      const response = (await secureFetch('/finance/forecast', { horizonDays })) as ForecastResponse;
      setForecastData(response.forecast);
      toast.show({ title: 'Forecast ready', description: `Projected cashflow over ${horizonDays} days.`, tone: 'finance' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to forecast';
      toast.show({ title: 'Forecast failed', description: message, tone: 'finance' });
    } finally {
      setForecastLoading(false);
    }
  }, [scenarioForm.horizonDays, secureFetch, toast]);

  const autopilotRules = useMemo(() => accounts.flatMap((account) => account.autopilotRules), [accounts]);

  const totalBalance = useMemo(() => accounts.reduce((sum, account) => sum + account.balance, 0), [accounts]);

  const autopilotQueued = useMemo(
    () =>
      accounts.reduce((sum, account) => {
        const accountQueued = account.autopilotRules
          .filter((rule) => rule.active)
          .reduce((subtotal, rule) => subtotal + account.balance * rule.percentage, 0);
        return sum + accountQueued;
      }, 0),
    [accounts],
  );

  const monthlyNet = useMemo(() => {
    return accounts.reduce((sum, account) => {
      if (!account.transactions.length) {
        return sum;
      }
      const sorted = account.transactions
        .slice()
        .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
      const first = new Date(sorted[0].occurredAt).getTime();
      const last = new Date(sorted[sorted.length - 1].occurredAt).getTime();
      const days = Math.max(1, (last - first) / (1000 * 60 * 60 * 24));
      const total = account.transactions.reduce((acc, transaction) => acc + transaction.amount, 0);
      const daily = total / days;
      return sum + daily * 30;
    }, 0);
  }, [accounts]);

  const runwayDays = useMemo(() => {
    if (monthlyNet < 0) {
      const monthlyBurn = Math.abs(monthlyNet);
      if (monthlyBurn === 0) {
        return Infinity;
      }
      return (totalBalance / monthlyBurn) * 30;
    }
    return Infinity;
  }, [monthlyNet, totalBalance]);

  const latestForecastHorizon = useMemo(() => forecastData?.[0]?.horizonDays ?? null, [forecastData]);
  const projectedTotal = useMemo(
    () => (forecastData ? forecastData.reduce((sum, row) => sum + row.projected, 0) : null),
    [forecastData],
  );

  const forecastSpark = useMemo(() => {
    if (!forecastData || !projectedTotal) {
      return [
        { label: 'Today', value: Number(totalBalance.toFixed(2)) },
        { label: '+30d', value: Number((totalBalance * 0.92).toFixed(2)) },
      ];
    }
    return [
      { label: 'Today', value: Number(totalBalance.toFixed(2)) },
      {
        label: `+${latestForecastHorizon}d`,
        value: Number(projectedTotal.toFixed(2)),
      },
    ];
  }, [forecastData, latestForecastHorizon, projectedTotal, totalBalance]);

  const formatCurrency = useCallback((value: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  }, []);

  const cashflowStats = useMemo(() => {
    const runwayLabel = Number.isFinite(runwayDays)
      ? `${Math.max(0, Math.round(runwayDays))} days`
      : 'Cashflow positive';
    const netTrend = monthlyNet >= 0 ? 'up' : 'down';
    const netLabel = `${monthlyNet >= 0 ? '+' : ''}${formatCurrency(monthlyNet)}/mo`;
    const autopilotTrend = autopilotQueued >= 0 ? 'up' : 'steady';
    const projectedTrend = projectedTotal !== null && projectedTotal < totalBalance ? 'down' : 'up';
    const projectedDelta = projectedTotal !== null ? projectedTotal - totalBalance : 0;

    return [
      {
        label: 'Runway',
        value: runwayLabel,
        delta: netLabel,
        trend: netTrend as 'up' | 'down' | 'steady',
      },
      {
        label: 'Autopilot queued',
        value: formatCurrency(autopilotQueued),
        delta: `${autopilotRules.filter((rule) => rule.active).length} rules active`,
        trend: autopilotTrend as 'up' | 'down' | 'steady',
      },
      {
        label: 'Projected balance',
        value: formatCurrency(projectedTotal ?? totalBalance),
        delta:
          projectedTotal !== null
            ? `${projectedDelta >= 0 ? '+' : ''}${formatCurrency(projectedDelta)}`
            : 'Run forecast to compare',
        trend: projectedTotal === null ? ('steady' as const) : (projectedTrend as 'up' | 'down' | 'steady'),
      },
    ];
  }, [autopilotQueued, autopilotRules, formatCurrency, monthlyNet, projectedTotal, runwayDays, totalBalance]);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <View style={styles.sectionGap}>
            <SectionCard tone="finance" elevation="soft">
              <Text style={styles.sectionTitle}>Cashflow lens</Text>
              <Text style={styles.sectionSubtitle}>
                Forecast balances and monitor autopilot impact before the month even starts.
              </Text>
              <SparklineChart
                tone="finance"
                title="Balance projection"
                subtitle={
                  latestForecastHorizon
                    ? `Projected over ${latestForecastHorizon} days`
                    : 'Run a scenario to unlock projections'
                }
                data={forecastSpark}
              />
            </SectionCard>
            <SectionCard tone="finance" elevation="none">
              <Text style={styles.sectionTitleSmall}>Accounts on deck</Text>
              {accounts.length === 0 ? (
                <Text style={styles.bodyText}>Add an account to start forecasting cashflow.</Text>
              ) : (
                accounts.map((account) => {
                  const inflows = account.transactions.filter((t) => t.amount > 0).length;
                  const outflows = account.transactions.filter((t) => t.amount < 0).length;
                  const autopilotTotal = account.autopilotRules
                    .filter((rule) => rule.active)
                    .reduce((sum, rule) => sum + account.balance * rule.percentage, 0);
                  return (
                    <View key={account.id} style={styles.accountCard}>
                      <View style={styles.accountHeader}>
                        <Text style={styles.accountName}>{account.name}</Text>
                        <Text style={styles.accountBalance}>{formatCurrency(account.balance, account.currency)}</Text>
                      </View>
                      <Text style={styles.accountMeta}>{account.type} · {account.currency}</Text>
                      <View style={styles.accountMetrics}>
                        <Text style={styles.accountMetricLabel}>Autopilot</Text>
                        <Text style={styles.accountMetricValue}>{formatCurrency(autopilotTotal, account.currency)}</Text>
                        <Text style={styles.accountMetricLabel}>Transactions</Text>
                        <Text style={styles.accountMetricValue}>{inflows} in · {outflows} out</Text>
                      </View>
                    </View>
                  );
                })
              )}
            </SectionCard>
            <SectionCard tone="finance" elevation="none">
              <Text style={styles.sectionTitleSmall}>Upcoming calendar</Text>
              <Timeline items={financeTimeline} tone="finance" />
            </SectionCard>
          </View>
        );
      case 'autopilot':
        return (
          <View style={styles.sectionGap}>
            <SectionCard tone="finance" elevation="soft">
              <Text style={styles.sectionTitle}>Savings autopilot</Text>
              <Text style={styles.sectionSubtitle}>
                Route every payout across envelopes automatically. Percentages prorate off the live balance.
              </Text>
              <View style={styles.accountPicker}>
                {accounts.map((account) => (
                  <Pressable
                    key={account.id}
                    style={[
                      styles.accountPill,
                      autopilotForm.accountId === account.id && styles.accountPillActive,
                    ]}
                    onPress={() =>
                      setAutopilotForm((prev) => ({
                        ...prev,
                        accountId: prev.accountId === account.id ? null : account.id,
                      }))
                    }
                  >
                    <Text style={styles.accountPillText}>{account.name}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={autopilotForm.name}
                onChangeText={(value) => setAutopilotForm((prev) => ({ ...prev, name: value }))}
                placeholder="Rule name"
                placeholderTextColor="#86efac"
                style={styles.input}
              />
              <TextInput
                value={autopilotForm.percentage}
                onChangeText={(value) => setAutopilotForm((prev) => ({ ...prev, percentage: value }))}
                placeholder="Percentage (e.g. 0.15 or 15)"
                placeholderTextColor="#86efac"
                keyboardType="numeric"
                style={styles.input}
              />
              <TextInput
                value={autopilotForm.destination}
                onChangeText={(value) => setAutopilotForm((prev) => ({ ...prev, destination: value }))}
                placeholder="Destination account"
                placeholderTextColor="#86efac"
                style={styles.input}
              />
              <Pressable style={styles.primaryButton} onPress={handleAutopilotSubmit}>
                <Text style={styles.primaryButtonText}>Save autopilot rule</Text>
              </Pressable>
            </SectionCard>
            <SectionCard tone="finance" elevation="none">
              <Text style={styles.sectionTitleSmall}>Active rules</Text>
              {autopilotRules.length === 0 ? (
                <Text style={styles.bodyText}>No rules yet. Create one above to start.</Text>
              ) : (
                autopilotRules.map((rule) => (
                  <View key={rule.id} style={styles.autopilotCard}>
                    <Text style={styles.autopilotName}>{rule.name}</Text>
                    <Text style={styles.autopilotMeta}>
                      {(rule.percentage * 100).toFixed(1)}% → {rule.destination}
                    </Text>
                    <Text style={styles.autopilotStatus}>{rule.active ? 'Active' : 'Paused'}</Text>
                  </View>
                ))
              )}
            </SectionCard>
            <SectionCard tone="finance" elevation="none">
              <Text style={styles.sectionTitleSmall}>Log transaction</Text>
              <View style={styles.accountPicker}>
                {accounts.map((account) => (
                  <Pressable
                    key={account.id}
                    style={[
                      styles.accountPill,
                      transactionForm.accountId === account.id && styles.accountPillActive,
                    ]}
                    onPress={() =>
                      setTransactionForm((prev) => ({
                        ...prev,
                        accountId: prev.accountId === account.id ? null : account.id,
                      }))
                    }
                  >
                    <Text style={styles.accountPillText}>{account.name}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={transactionForm.description}
                onChangeText={(value) => setTransactionForm((prev) => ({ ...prev, description: value }))}
                placeholder="Description"
                placeholderTextColor="#86efac"
                style={styles.input}
              />
              <TextInput
                value={transactionForm.amount}
                onChangeText={(value) => setTransactionForm((prev) => ({ ...prev, amount: value }))}
                placeholder="Amount (positive or negative)"
                placeholderTextColor="#86efac"
                keyboardType="decimal-pad"
                style={styles.input}
              />
              <TextInput
                value={transactionForm.category}
                onChangeText={(value) => setTransactionForm((prev) => ({ ...prev, category: value }))}
                placeholder="Category"
                placeholderTextColor="#86efac"
                style={styles.input}
              />
              <TextInput
                value={transactionForm.occurredAt}
                onChangeText={(value) => setTransactionForm((prev) => ({ ...prev, occurredAt: value }))}
                placeholder="Occurred at (ISO)"
                placeholderTextColor="#86efac"
                style={styles.input}
              />
              <Pressable style={styles.primaryButton} onPress={handleTransactionSubmit}>
                <Text style={styles.primaryButtonText}>Log transaction</Text>
              </Pressable>
            </SectionCard>
          </View>
        );
      case 'scenarios':
        return (
          <View style={styles.sectionGap}>
            <SectionCard tone="finance" elevation="soft">
              <Text style={styles.sectionTitle}>Scenario studio</Text>
              <Text style={styles.sectionSubtitle}>
                Stress test upcoming moves by adjusting the forecast horizon and watching projected balances.
              </Text>
              <View style={styles.horizonRow}>
                {[30, 60, 90].map((preset) => (
                  <Pressable
                    key={preset}
                    style={[
                      styles.horizonPill,
                      Number(scenarioForm.horizonDays) === preset && styles.horizonPillActive,
                    ]}
                    onPress={() => setScenarioForm({ horizonDays: String(preset) })}
                  >
                    <Text style={styles.horizonText}>{preset} days</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={scenarioForm.horizonDays}
                onChangeText={(value) => setScenarioForm({ horizonDays: value })}
                placeholder="Custom horizon (days)"
                placeholderTextColor="#86efac"
                keyboardType="numeric"
                style={styles.input}
              />
              <Pressable style={styles.primaryButton} onPress={handleForecast} disabled={forecastLoading}>
                {forecastLoading ? (
                  <ActivityIndicator color="#052e16" />
                ) : (
                  <Text style={styles.primaryButtonText}>Run forecast</Text>
                )}
              </Pressable>
            </SectionCard>
            <SectionCard tone="finance" elevation="none">
              <Text style={styles.sectionTitleSmall}>Projected balances</Text>
              {forecastData && forecastData.length ? (
                forecastData.map((row) => {
                  const account = accounts.find((item) => item.id === row.accountId);
                  return (
                    <View key={row.accountId} style={styles.scenarioCard}>
                      <Text style={styles.scenarioTitle}>{account?.name ?? 'Account'}</Text>
                      <Text style={styles.scenarioLine}>
                        Today · {formatCurrency(row.balance, account?.currency ?? 'USD')}
                      </Text>
                      <Text style={styles.scenarioLine}>
                        Projected · {formatCurrency(row.projected, account?.currency ?? 'USD')}
                      </Text>
                      <Text style={styles.scenarioLine}>
                        Autopilot impact · {formatCurrency(row.autopilot, account?.currency ?? 'USD')}
                      </Text>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.bodyText}>Run a forecast to populate scenario cards.</Text>
              )}
            </SectionCard>
            <SectionCard tone="finance" elevation="none">
              <Text style={styles.sectionTitleSmall}>Playbook prompts</Text>
              <Checklist
                items={[
                  {
                    id: 'stretch-purchase',
                    title: 'Rehearse stretch purchase',
                    description: 'Forecast 90 days post-upgrade to confirm cashfloor never dips below $3k.',
                    status: 'queued',
                  },
                  {
                    id: 'slow-month',
                    title: 'Slow month buffer',
                    description: 'Simulate 30 days without gig income and stage new autopilot ratios.',
                    status: 'in_progress',
                  },
                  {
                    id: 'tax-reset',
                    title: 'Tax reset',
                    description: 'Increase tax autopilot to 27% before next quarterly payment hits.',
                    status: 'done',
                  },
                ]}
                tone="finance"
              />
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
        tone="finance"
        title="Welcome to LedgerLoop Planner"
        description="Project runway, automate savings, and rehearse financial moves without spreadsheets."
        onClose={() => setOnboardingVisible(false)}
        actions={[
          {
            id: 'continue',
            label: 'Start planning',
            tone: 'finance',
            onPress: () => setOnboardingVisible(false),
          },
        ]}
      >
        <Text style={styles.modalBullet}>• Link accounts to unlock forecasting and autopilot insights.</Text>
        <Text style={styles.modalBullet}>• Queue savings rules so every payout automatically funds your goals.</Text>
        <Text style={styles.modalBullet}>• Spin up scenarios to preview runway before big purchases land.</Text>
      </ModalSheet>

      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        <GradientLayout tone="finance">
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl tintColor="#bbf7d0" refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <View style={styles.hero}>
              <View style={styles.heroCopy}>
                <Text style={styles.eyeBrow}>Cashflow Command</Text>
                <Text style={styles.title}>LedgerLoop Planner</Text>
                <Text style={styles.subtitle}>
                  Forecast, automate, and rehearse financial moves so surprises never derail your plans.
                </Text>
              </View>
              <SectionCard tone="finance" padding={18} elevation="soft" style={styles.personaCard}>
                <Text style={styles.personaLabel}>Member</Text>
                <Text style={styles.personaName}>{persona.name}</Text>
                <Text style={styles.personaRole}>{persona.role}</Text>
                <Text style={styles.personaSummary}>{persona.focus}</Text>
                <NavigationTabs
                  items={[
                    { id: 'overview', label: 'Overview' },
                    { id: 'autopilot', label: 'Autopilot' },
                    { id: 'scenarios', label: 'Scenarios' },
                  ]}
                  activeId={activeTab}
                  onChange={(tabId) => setActiveTab(tabId as TabId)}
                />
              </SectionCard>
            </View>

            <View style={styles.statsRow}>
              {cashflowStats.map((stat) => (
                <StatBadge key={stat.label} tone="finance" {...stat} style={styles.statBadge} />
              ))}
            </View>

            {!token ? (
              <SectionCard tone="finance" elevation="soft">
                <Text style={styles.sectionTitle}>Link LedgerLoop backend</Text>
                <Text style={styles.sectionSubtitle}>
                  Sign in to load accounts, transactions, and savings rules for live simulations.
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
                  placeholder="founder@example.com"
                  placeholderTextColor="#86efac"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="#86efac"
                  secureTextEntry
                  style={styles.input}
                />
                {mode === 'register' ? (
                  <TextInput
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Display name"
                    placeholderTextColor="#86efac"
                    style={styles.input}
                  />
                ) : null}
                {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
                <Pressable style={styles.primaryButton} onPress={handleAuth} disabled={loadingAuth}>
                  {loadingAuth ? <ActivityIndicator color="#052e16" /> : <Text style={styles.primaryButtonText}>Continue</Text>}
                </Pressable>
              </SectionCard>
            ) : (
              <SectionCard tone="finance" elevation="soft">
                <Text style={styles.sectionTitle}>Connected to LedgerLoop cloud</Text>
                <Text style={styles.sectionSubtitle}>Refresh to sync the latest accounts, rules, and transactions.</Text>
                <Pressable style={[styles.primaryButton, styles.logoutButton]} onPress={handleLogout}>
                  <Text style={[styles.primaryButtonText, styles.logoutText]}>Log out</Text>
                </Pressable>
              </SectionCard>
            )}

            <SectionCard tone="finance" elevation="soft">
              <Text style={styles.sectionTitleSmall}>Add an account</Text>
              <TextInput
                value={accountForm.name}
                onChangeText={(value) => setAccountForm((prev) => ({ ...prev, name: value }))}
                placeholder="Account name"
                placeholderTextColor="#86efac"
                style={styles.input}
              />
              <TextInput
                value={accountForm.type}
                onChangeText={(value) => setAccountForm((prev) => ({ ...prev, type: value }))}
                placeholder="Account type (CHECKING, SAVINGS, etc.)"
                placeholderTextColor="#86efac"
                style={styles.input}
              />
              <TextInput
                value={accountForm.currency}
                onChangeText={(value) => setAccountForm((prev) => ({ ...prev, currency: value }))}
                placeholder="Currency (USD)"
                placeholderTextColor="#86efac"
                style={styles.input}
              />
              <TextInput
                value={accountForm.balance}
                onChangeText={(value) => setAccountForm((prev) => ({ ...prev, balance: value }))}
                placeholder="Balance"
                placeholderTextColor="#86efac"
                keyboardType="decimal-pad"
                style={styles.input}
              />
              <Pressable style={styles.primaryButton} onPress={handleAccountSubmit}>
                <Text style={styles.primaryButtonText}>Save account</Text>
              </Pressable>
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
    color: palette.finance.accent,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: palette.finance.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    color: palette.finance.textSecondary,
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
    color: '#86efac',
  },
  personaName: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.finance.textPrimary,
  },
  personaRole: {
    fontSize: 14,
    color: palette.finance.textSecondary,
  },
  personaSummary: {
    fontSize: 14,
    color: '#bbf7d0',
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
    color: '#ecfdf5',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 15,
    color: '#bbf7d0',
    lineHeight: 22,
    marginBottom: 12,
  },
  sectionTitleSmall: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ecfdf5',
  },
  bodyText: {
    color: '#bbf7d0',
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
    backgroundColor: 'rgba(22, 101, 52, 0.4)',
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
  },
  toggleText: {
    color: '#ecfdf5',
    fontWeight: '600',
  },
  input: {
    backgroundColor: 'rgba(12, 53, 29, 0.8)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
    color: '#ecfdf5',
    fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }),
    marginTop: 10,
  },
  primaryButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  primaryButtonText: {
    fontWeight: '700',
    fontSize: 16,
    color: '#052e16',
  },
  logoutButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  logoutText: {
    color: '#22c55e',
  },
  errorText: {
    color: '#f97316',
    fontWeight: '600',
    marginTop: 10,
  },
  accountPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  accountPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(12, 53, 29, 0.7)',
  },
  accountPillActive: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
  },
  accountPillText: {
    color: '#bbf7d0',
    fontWeight: '600',
  },
  accountCard: {
    backgroundColor: 'rgba(5, 46, 22, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
    gap: 8,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ecfdf5',
  },
  accountBalance: {
    fontSize: 16,
    fontWeight: '700',
    color: '#22c55e',
  },
  accountMeta: {
    color: '#bbf7d0',
    fontSize: 13,
  },
  accountMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountMetricLabel: {
    color: '#bbf7d0',
    fontSize: 12,
  },
  accountMetricValue: {
    color: '#ecfdf5',
    fontWeight: '600',
  },
  autopilotCard: {
    backgroundColor: 'rgba(5, 46, 22, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
    gap: 4,
  },
  autopilotName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ecfdf5',
  },
  autopilotMeta: {
    color: '#bbf7d0',
  },
  autopilotStatus: {
    color: '#22c55e',
    fontWeight: '600',
  },
  horizonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  horizonPill: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(12, 53, 29, 0.7)',
  },
  horizonPillActive: {
    borderColor: '#22c55e',
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
  },
  horizonText: {
    color: '#bbf7d0',
    fontWeight: '600',
  },
  scenarioCard: {
    backgroundColor: 'rgba(5, 46, 22, 0.8)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
    gap: 4,
  },
  scenarioTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ecfdf5',
  },
  scenarioLine: {
    color: '#bbf7d0',
  },
  modalBullet: {
    color: '#bbf7d0',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
});
