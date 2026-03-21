import React, { useState, useEffect, useCallback } from 'react';
import { render, Box, Text, useInput, useApp, useStdout } from 'ink';
import Spinner from 'ink-spinner';
import { Command } from 'commander';
import { loadConfig, type GrowConfig } from '../config/index.js';
import {
  loadTokens,
  fetchSearchAnalytics,
  type GoogleTokens,
  type SearchAnalyticsRow,
} from '../auth/google.js';
import MultiSelect from '../ui/multi-select.js';

// --- Types & Constants ---

type PeriodKey = '7d' | '28d' | '3m' | '6m' | '12m' | '16m';

const PERIODS: { key: PeriodKey; label: string; days: number }[] = [
  { key: '7d', label: '7d', days: 7 },
  { key: '28d', label: '28d', days: 28 },
  { key: '3m', label: '3m', days: 90 },
  { key: '6m', label: '6m', days: 180 },
  { key: '12m', label: '12m', days: 365 },
  { key: '16m', label: '16m', days: 487 },
];

interface SummaryMetrics {
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GSCData {
  summary: SummaryMetrics;
  prevSummary: SummaryMetrics;
  queries: Array<{ query: string; clicks: number; impressions: number; position: number }>;
  pages: Array<{ page: string; clicks: number; impressions: number; position: number }>;
}

// --- Date Utilities ---

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function getDateRange(days: number) {
  const now = new Date();
  const endDate = new Date(now);
  endDate.setDate(now.getDate() - 3);

  const startDate = new Date(endDate);
  startDate.setDate(endDate.getDate() - days + 1);

  const prevEndDate = new Date(startDate);
  prevEndDate.setDate(startDate.getDate() - 1);

  const prevStartDate = new Date(prevEndDate);
  prevStartDate.setDate(prevEndDate.getDate() - days + 1);

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    prevStartDate: formatDate(prevStartDate),
    prevEndDate: formatDate(prevEndDate),
  };
}

// --- Formatting Utilities ---

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return n.toLocaleString('en-US');
}

function formatPercent(n: number): string {
  return (n * 100).toFixed(2) + '%';
}

function formatPosition(n: number): string {
  return n.toFixed(1);
}

function calcChange(current: number, previous: number): { text: string; positive: boolean } {
  if (previous === 0) {
    if (current === 0) return { text: '—', positive: true };
    return { text: '+∞', positive: true };
  }
  const pct = ((current - previous) / previous) * 100;
  const sign = pct >= 0 ? '+' : '';
  return { text: `${sign}${pct.toFixed(1)}%`, positive: pct >= 0 };
}

function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen - 1) + '…';
}

function padRight(s: string, len: number): string {
  return s.length >= len ? s.slice(0, len) : s + ' '.repeat(len - s.length);
}

function padLeft(s: string, len: number): string {
  return s.length >= len ? s.slice(0, len) : ' '.repeat(len - s.length) + s;
}

// --- Cache ---

const cache = new Map<string, GSCData>();

function cacheKey(siteUrl: string, periodKey: PeriodKey): string {
  return `${siteUrl}|${periodKey}`;
}

// --- Data Fetching ---

function aggregateRows(rows: SearchAnalyticsRow[]): SummaryMetrics {
  if (rows.length === 0) return { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  const row = rows[0];
  return { clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position };
}

async function fetchGSCData(
  config: GrowConfig,
  tokens: GoogleTokens,
  siteUrl: string,
  periodKey: PeriodKey,
): Promise<GSCData> {
  const period = PERIODS.find(p => p.key === periodKey)!;
  const { startDate, endDate, prevStartDate, prevEndDate } = getDateRange(period.days);
  const { client_id, client_secret } = config.google!;

  const [summaryRows, prevSummaryRows, queryRows, pageRows] = await Promise.all([
    fetchSearchAnalytics(client_id, client_secret, tokens, {
      siteUrl, startDate, endDate,
    }),
    fetchSearchAnalytics(client_id, client_secret, tokens, {
      siteUrl, startDate: prevStartDate, endDate: prevEndDate,
    }),
    fetchSearchAnalytics(client_id, client_secret, tokens, {
      siteUrl, startDate, endDate, dimensions: ['query'], rowLimit: 20,
    }),
    fetchSearchAnalytics(client_id, client_secret, tokens, {
      siteUrl, startDate, endDate, dimensions: ['page'], rowLimit: 20,
    }),
  ]);

  return {
    summary: aggregateRows(summaryRows),
    prevSummary: aggregateRows(prevSummaryRows),
    queries: queryRows.map(r => ({
      query: r.keys[0] ?? '',
      clicks: r.clicks,
      impressions: r.impressions,
      position: r.position,
    })),
    pages: pageRows.map(r => ({
      page: r.keys[0] ?? '',
      clicks: r.clicks,
      impressions: r.impressions,
      position: r.position,
    })),
  };
}

// --- Site Selection Screen ---

function SiteSelection({
  sites,
  onSubmit,
}: {
  sites: string[];
  onSubmit: (selected: string[]) => void;
}) {
  const { exit } = useApp();
  const [error, setError] = useState('');

  const handleSubmit = (selected: string[]) => {
    if (selected.length === 0) {
      setError('Select at least one site.');
      return;
    }
    onSubmit(selected);
  };

  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      exit();
    }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Grow CLI — Google Search Console</Text>
      <Text> </Text>
      <Text>Select sites to review:</Text>
      <Text dimColor>Use ↑/↓ to move, Space to toggle, A to toggle all, Enter to confirm.</Text>
      <Text> </Text>
      <MultiSelect
        items={sites.map(site => ({ label: site, value: site }))}
        initialSelectedValues={[]}
        onSubmit={handleSubmit}
      />
      {error && <Text color="red">{error}</Text>}
      <Text> </Text>
      <Text dimColor>q to quit</Text>
    </Box>
  );
}

// --- Dashboard Sub-components ---

function SiteBar({ sites, activeIndex }: { sites: string[]; activeIndex: number }) {
  return (
    <Box>
      <Text dimColor>Site: </Text>
      <Text bold color="cyan">{sites[activeIndex]}</Text>
      {sites.length > 1 && (
        <Text dimColor>  ({activeIndex + 1}/{sites.length}, Tab to switch)</Text>
      )}
    </Box>
  );
}

function PeriodBar({ activeIndex }: { activeIndex: number }) {
  return (
    <Box>
      <Text dimColor>Period: </Text>
      {PERIODS.map((p, i) => (
        <React.Fragment key={p.key}>
          {i > 0 && <Text> </Text>}
          {i === activeIndex ? (
            <Text bold color="cyan">[{p.label}]</Text>
          ) : (
            <Text dimColor> {p.label} </Text>
          )}
        </React.Fragment>
      ))}
    </Box>
  );
}

function MetricCard({
  label,
  value,
  change,
  invertColor,
}: {
  label: string;
  value: string;
  change: { text: string; positive: boolean };
  invertColor?: boolean;
}) {
  const isGood = invertColor ? !change.positive : change.positive;
  return (
    <Box flexDirection="column" marginRight={2}>
      <Text dimColor>{label}</Text>
      <Box>
        <Text bold>{value}</Text>
        <Text> </Text>
        <Text color={change.text === '—' ? undefined : isGood ? 'green' : 'red'}>
          {change.text}
        </Text>
      </Box>
    </Box>
  );
}

function SummaryCards({ data }: { data: GSCData }) {
  const { summary: s, prevSummary: p } = data;
  return (
    <Box>
      <MetricCard label="Clicks" value={formatNumber(s.clicks)} change={calcChange(s.clicks, p.clicks)} />
      <MetricCard label="Impressions" value={formatNumber(s.impressions)} change={calcChange(s.impressions, p.impressions)} />
      <MetricCard label="CTR" value={formatPercent(s.ctr)} change={calcChange(s.ctr, p.ctr)} />
      <MetricCard label="Avg Position" value={formatPosition(s.position)} change={calcChange(s.position, p.position)} invertColor />
    </Box>
  );
}

function DataTable({
  title,
  rows,
  labelKey,
  scrollOffset,
  visibleRows,
  termWidth,
}: {
  title: string;
  rows: Array<Record<string, string | number>>;
  labelKey: string;
  scrollOffset: number;
  visibleRows: number;
  termWidth: number;
}) {
  const numW = 4;
  const clicksW = 8;
  const imprW = 8;
  const posW = 6;
  const fixedW = numW + clicksW + imprW + posW + 4;
  const labelW = Math.max(20, termWidth - fixedW - 2);

  const visible = rows.slice(scrollOffset, scrollOffset + visibleRows);
  const canScrollUp = scrollOffset > 0;
  const canScrollDown = scrollOffset + visibleRows < rows.length;

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold>{title}</Text>
        {rows.length > visibleRows && (
          <Text dimColor> ({scrollOffset + 1}-{Math.min(scrollOffset + visibleRows, rows.length)} of {rows.length})</Text>
        )}
      </Box>
      <Text dimColor>
        {padRight('#', numW)}
        {padRight(labelKey === 'query' ? 'Query' : 'Page', labelW)}
        {padLeft('Clicks', clicksW)}
        {padLeft('Impr', imprW)}
        {padLeft('Pos', posW)}
      </Text>
      {canScrollUp && <Text dimColor>  ▲ more above</Text>}
      {visible.map((row, i) => {
        const idx = scrollOffset + i + 1;
        return (
          <Text key={idx}>
            {padRight(String(idx), numW)}
            {padRight(truncate(String(row[labelKey]), labelW - 1), labelW)}
            {padLeft(formatNumber(row.clicks as number), clicksW)}
            {padLeft(formatNumber(row.impressions as number), imprW)}
            {padLeft(formatPosition(row.position as number), posW)}
          </Text>
        );
      })}
      {canScrollDown && <Text dimColor>  ▼ more below</Text>}
    </Box>
  );
}

function StatusBar() {
  return (
    <Box>
      <Text dimColor>←/→ period  Tab site  ↑/↓ scroll  q quit</Text>
    </Box>
  );
}

// --- Dashboard ---

function GSCDashboard({
  config,
  tokens,
  selectedSites,
}: {
  config: GrowConfig;
  tokens: GoogleTokens;
  selectedSites: string[];
}) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  const [siteIndex, setSiteIndex] = useState(0);
  const [periodIndex, setPeriodIndex] = useState(1);
  const [data, setData] = useState<GSCData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scrollOffset, setScrollOffset] = useState(0);

  const currentSite = selectedSites[siteIndex];
  const currentPeriod = PERIODS[periodIndex];

  const termRows = stdout.rows ?? 24;
  const termCols = stdout.columns ?? 80;
  const chromeLines = 15;
  const availableForTables = Math.max(4, termRows - chromeLines);
  const rowsPerTable = Math.floor(availableForTables / 2);

  const maxRows = data ? Math.max(data.queries.length, data.pages.length) : 0;
  const maxScroll = Math.max(0, maxRows - rowsPerTable);

  const fetchData = useCallback(async () => {
    const key = cacheKey(currentSite, currentPeriod.key);
    const cached = cache.get(key);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await fetchGSCData(config, tokens, currentSite, currentPeriod.key);
      cache.set(key, result);
      setData(result);
    } catch (err: any) {
      setError(err.message ?? 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [currentSite, currentPeriod.key]);

  useEffect(() => {
    setScrollOffset(0);
    fetchData();
  }, [fetchData]);

  useInput((input, key) => {
    if (input === 'q' || key.escape) {
      exit();
      return;
    }

    if (key.tab) {
      setSiteIndex(i => (i + 1) % selectedSites.length);
      return;
    }

    if (key.leftArrow) {
      setPeriodIndex(i => Math.max(0, i - 1));
      return;
    }

    if (key.rightArrow) {
      setPeriodIndex(i => Math.min(PERIODS.length - 1, i + 1));
      return;
    }

    if (key.upArrow) {
      setScrollOffset(o => Math.max(0, o - 1));
      return;
    }

    if (key.downArrow) {
      setScrollOffset(o => Math.min(maxScroll, o + 1));
      return;
    }
  });

  useEffect(() => {
    process.stdout.write('\x1b[?1049h');
    process.stdout.write('\x1b[?25l');
    return () => {
      process.stdout.write('\x1b[?25h');
      process.stdout.write('\x1b[?1049l');
    };
  }, []);

  return (
    <Box flexDirection="column" height={termRows}>
      <Text bold>Grow CLI — Google Search Console</Text>
      <SiteBar sites={selectedSites} activeIndex={siteIndex} />
      <PeriodBar activeIndex={periodIndex} />
      <Text> </Text>

      {loading && (
        <Text>
          <Spinner type="dots" /> Fetching data…
        </Text>
      )}

      {error && (
        <Box flexDirection="column">
          <Text color="red">Error: {error}</Text>
          {selectedSites.length > 1 && <Text dimColor>Press Tab to try another site.</Text>}
        </Box>
      )}

      {!loading && !error && data && (
        <>
          <SummaryCards data={data} />
          <Text> </Text>
          <DataTable
            title="Top Queries"
            rows={data.queries}
            labelKey="query"
            scrollOffset={scrollOffset}
            visibleRows={rowsPerTable}
            termWidth={termCols}
          />
          <Text> </Text>
          <DataTable
            title="Top Pages"
            rows={data.pages}
            labelKey="page"
            scrollOffset={scrollOffset}
            visibleRows={rowsPerTable}
            termWidth={termCols}
          />
        </>
      )}

      {!loading && !error && data && data.queries.length === 0 && data.pages.length === 0 && (
        <Text dimColor>No data available for this period.</Text>
      )}

      <Box flexGrow={1} />
      <StatusBar />
    </Box>
  );
}

// --- Root Component ---

function GSCApp({ config, tokens }: { config: GrowConfig; tokens: GoogleTokens }) {
  const sites = config.google!.sites;
  const [selectedSites, setSelectedSites] = useState<string[] | null>(
    sites.length === 1 ? sites : null,
  );

  if (!selectedSites) {
    return <SiteSelection sites={sites} onSubmit={setSelectedSites} />;
  }

  return <GSCDashboard config={config} tokens={tokens} selectedSites={selectedSites} />;
}

// --- Command ---

export const gscCommand = new Command('gsc')
  .description('View Google Search Console metrics')
  .action(async () => {
    const config = loadConfig();
    if (!config.google?.sites?.length) {
      console.error('No Google Search Console sites configured. Run "grow connect google" first.');
      process.exit(1);
    }

    const tokens = loadTokens();
    if (!tokens) {
      console.error('No Google auth tokens found. Run "grow connect google" first.');
      process.exit(1);
    }

    const instance = render(<GSCApp config={config} tokens={tokens} />);
    await instance.waitUntilExit();
  });
