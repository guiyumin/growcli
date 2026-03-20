import React, { useState, useEffect } from 'react';
import { render, Box, Text, useApp } from 'ink';
import Spinner from 'ink-spinner';
import { Command } from 'commander';
import open from 'open';
import {
  getAuthUrl,
  waitForAuthCode,
  exchangeCodeForTokens,
  listSites,
} from '../auth/google.js';
import { loadConfig, saveConfig } from '../config/index.js';
import MultiSelect from '../ui/multi-select.js';
import SingleLineInput from '../ui/single-line-input.js';

type Step = 'client_id' | 'client_secret' | 'authorizing' | 'select_sites' | 'done' | 'error';

function GoogleConnect() {
  const { exit } = useApp();
  const [step, setStep] = useState<Step>('client_id');
  const [clientIdInput, setClientIdInput] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecretInput, setClientSecretInput] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [sites, setSites] = useState<string[]>([]);
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [siteSelectionError, setSiteSelectionError] = useState('');
  const [error, setError] = useState('');

  const handleClientIdSubmit = (submittedClientId: string) => {
    setClientId(submittedClientId);
    setStep('client_secret');
  };

  const handleClientSecretSubmit = (submittedClientSecret: string) => {
    setClientSecret(submittedClientSecret);
    setStep('authorizing');
  };

  useEffect(() => {
    if (step !== 'authorizing') return;

    (async () => {
      try {
        const authUrl = getAuthUrl(clientId, clientSecret);
        const codePromise = waitForAuthCode();
        await open(authUrl);
        const code = await codePromise;
        const tokens = await exchangeCodeForTokens(clientId, clientSecret, code);
        const siteList = await listSites(clientId, clientSecret, tokens);

        if (siteList.length === 0) {
          setError('No sites found in your Google Search Console. Add a site first at https://search.google.com/search-console');
          setStep('error');
          return;
        }

        if (siteList.length === 1) {
          setSelectedSites(siteList);
          saveGoogleConfig(clientId, clientSecret, siteList);
          setStep('done');
          return;
        }

        setSites(siteList);
        setSiteSelectionError('');
        setStep('select_sites');
      } catch (err: any) {
        setError(err.message);
        setStep('error');
      }
    })();
  }, [step]);

  const handleSiteSelect = (submittedSites: string[]) => {
    if (submittedSites.length === 0) {
      setSiteSelectionError('Select at least one site.');
      return;
    }

    setSelectedSites(submittedSites);
    saveGoogleConfig(clientId, clientSecret, submittedSites);
    setStep('done');
  };

  useEffect(() => {
    if (step === 'done' || step === 'error') {
      const timer = setTimeout(() => {
        exit(step === 'error' ? 1 : 0);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [step]);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Grow CLI — Connect Google Search Console</Text>
      <Text> </Text>

      {step === 'client_id' && (
        <Box flexDirection="column">
          <Text dimColor>Step 1/3: Enter your OAuth credentials from Google Cloud Console</Text>
          <Text> </Text>
          <Text>Client ID</Text>
          <Text dimColor>Paste the full OAuth client ID, then press Enter.</Text>
          <Text dimColor>Format: &lt;id&gt;.apps.googleusercontent.com</Text>
          <SingleLineInput
            value={clientIdInput}
            onChange={setClientIdInput}
            onSubmit={handleClientIdSubmit}
            placeholder="Paste here"
          />
          {clientIdInput.length > 0 && (
            <Text dimColor>{clientIdInput.length} chars captured.</Text>
          )}
        </Box>
      )}

      {step === 'client_secret' && (
        <Box flexDirection="column">
          <Text dimColor>Step 1/3: Enter your OAuth credentials from Google Cloud Console</Text>
          <Text> </Text>
          <Text>Client ID captured.</Text>
          <Text> </Text>
          <Text>Client Secret</Text>
          <Text dimColor>Paste the full OAuth client secret, then press Enter.</Text>
          <SingleLineInput
            value={clientSecretInput}
            onChange={setClientSecretInput}
            onSubmit={handleClientSecretSubmit}
            placeholder="Paste here"
            mask="*"
          />
          {clientSecretInput.length > 0 && (
            <Text dimColor>{clientSecretInput.length} chars captured.</Text>
          )}
        </Box>
      )}

      {step === 'authorizing' && (
        <Box flexDirection="column">
          <Text dimColor>Step 2/3: Authorize in browser</Text>
          <Text> </Text>
          <Text>
            <Spinner type="dots" /> Opening browser... Sign in with your Google account.
          </Text>
        </Box>
      )}

      {step === 'select_sites' && (
        <Box flexDirection="column">
          <Text dimColor>Step 3/3: Select sites</Text>
          <Text> </Text>
          <Text dimColor>All sites start selected. Use ↑/↓ to move, Space to toggle, A to toggle all, Enter to confirm.</Text>
          <Text dimColor>{sites.length} sites found.</Text>
          <Text> </Text>
          <MultiSelect
            items={sites.map(site => ({ label: site, value: site }))}
            initialSelectedValues={sites}
            onSubmit={handleSiteSelect}
          />
          {siteSelectionError && <Text color="red">✗ {siteSelectionError}</Text>}
        </Box>
      )}

      {step === 'done' && (
        <Box flexDirection="column">
          <Text color="green">✓ Connected to {selectedSites.length} {selectedSites.length === 1 ? 'site' : 'sites'}</Text>
          <Text dimColor>  Config saved to ~/.grow/config.json</Text>
          <Text dimColor>  Tokens saved to ~/.grow/auth/google.json</Text>
        </Box>
      )}

      {step === 'error' && (
        <Box flexDirection="column">
          <Text color="red">✗ {error}</Text>
        </Box>
      )}
    </Box>
  );
}

function saveGoogleConfig(clientId: string, clientSecret: string, sites: string[]) {
  const config = loadConfig();
  config.google = {
    client_id: clientId,
    client_secret: clientSecret,
    sites,
  };
  saveConfig(config);
}

export const connectCommand = new Command('connect')
  .description('Connect to external services');

connectCommand
  .command('google')
  .description('Connect to Google Search Console')
  .action(async () => {
    const instance = render(<GoogleConnect />);
    const exitCode = await instance.waitUntilExit();
    process.exit(typeof exitCode === 'number' ? exitCode : 0);
  });
