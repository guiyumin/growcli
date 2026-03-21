import { google } from 'googleapis';
import http from 'http';
import { URL } from 'url';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { getGrowDir } from '../config/index.js';

const SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly'];
const REDIRECT_PORT = 39587;
const REDIRECT_URI = `http://127.0.0.1:${REDIRECT_PORT}`;

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

export function getTokenPath(): string {
  return join(getGrowDir(), 'auth', 'google.json');
}

export function loadTokens(): GoogleTokens | null {
  const path = getTokenPath();
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8'));
}

function saveTokens(tokens: GoogleTokens): void {
  const path = getTokenPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(tokens, null, 2));
}

export function getAuthUrl(clientId: string, clientSecret: string): string {
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

export function waitForAuthCode(): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, `http://127.0.0.1:${REDIRECT_PORT}`);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Authorization denied.</h1><p>You can close this tab.</p>');
        server.close();
        reject(new Error(`Authorization denied: ${error}`));
        return;
      }

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end('<h1>Authorization successful!</h1><p>You can close this tab and return to the terminal.</p>');
        server.close();
        resolve(code);
      }
    });

    server.listen(REDIRECT_PORT, '127.0.0.1');
    server.on('error', reject);
  });
}

export async function exchangeCodeForTokens(
  clientId: string,
  clientSecret: string,
  code: string
): Promise<GoogleTokens> {
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
  const { tokens } = await oauth2Client.getToken(code);
  const googleTokens: GoogleTokens = {
    access_token: tokens.access_token!,
    refresh_token: tokens.refresh_token!,
    expiry_date: tokens.expiry_date!,
  };
  saveTokens(googleTokens);
  return googleTokens;
}

function getAuthenticatedClient(
  clientId: string,
  clientSecret: string,
  tokens: GoogleTokens,
) {
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
  oauth2Client.setCredentials(tokens);
  oauth2Client.on('tokens', (newTokens) => {
    const merged: GoogleTokens = {
      access_token: newTokens.access_token ?? tokens.access_token,
      refresh_token: newTokens.refresh_token ?? tokens.refresh_token,
      expiry_date: newTokens.expiry_date ?? tokens.expiry_date,
    };
    saveTokens(merged);
  });
  return oauth2Client;
}

export async function listSites(
  clientId: string,
  clientSecret: string,
  tokens: GoogleTokens
): Promise<string[]> {
  const oauth2Client = getAuthenticatedClient(clientId, clientSecret, tokens);
  const webmasters = google.webmasters({ version: 'v3', auth: oauth2Client });
  const res = await webmasters.sites.list();
  return (res.data.siteEntry ?? []).map(entry => entry.siteUrl!);
}

export interface SearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export async function fetchSearchAnalytics(
  clientId: string,
  clientSecret: string,
  tokens: GoogleTokens,
  params: {
    siteUrl: string;
    startDate: string;
    endDate: string;
    dimensions?: string[];
    rowLimit?: number;
  },
): Promise<SearchAnalyticsRow[]> {
  const oauth2Client = getAuthenticatedClient(clientId, clientSecret, tokens);
  const webmasters = google.webmasters({ version: 'v3', auth: oauth2Client });
  const res = await webmasters.searchanalytics.query({
    siteUrl: params.siteUrl,
    requestBody: {
      startDate: params.startDate,
      endDate: params.endDate,
      dimensions: params.dimensions ?? [],
      rowLimit: params.rowLimit ?? 25000,
    },
  });

  return (res.data.rows ?? []).map(row => ({
    keys: row.keys ?? [],
    clicks: row.clicks ?? 0,
    impressions: row.impressions ?? 0,
    ctr: row.ctr ?? 0,
    position: row.position ?? 0,
  }));
}
