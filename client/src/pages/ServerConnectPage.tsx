import { useState } from 'react';
import { setStoredServerUrl } from '../lib/apiBaseUrl';

export function ServerConnectPage() {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let serverUrl = url.trim();
    if (!serverUrl) {
      setError('Please enter a server URL.');
      setLoading(false);
      return;
    }

    // Prepend protocol if not specified. Use http:// for IP addresses, https:// for domains.
    if (!/^https?:\/\//i.test(serverUrl)) {
      const hostPart = serverUrl.split(':')[0].split('/')[0];
      const isIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostPart) || hostPart === 'localhost';
      serverUrl = (isIp ? 'http://' : 'https://') + serverUrl;
    }

    // Strip trailing slashes
    serverUrl = serverUrl.replace(/\/+$/, '');

    try {
      const resp = await fetch(`${serverUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(10_000),
      });
      if (!resp.ok) throw new Error('Server returned an error');
      const data = await resp.json();
      if (data.service !== 'paracord') {
        throw new Error('Not a Paracord server');
      }
      setStoredServerUrl(serverUrl);
      // Force a full reload so the API client picks up the new base URL
      window.location.href = '/login';
    } catch {
      setError('Could not connect. Check the URL and ensure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <form onSubmit={handleSubmit} className="auth-card mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold leading-tight text-text-primary">Connect to Server</h1>
          <p className="mt-2 text-sm text-text-muted">
            Enter the URL of the Paracord server you want to connect to.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-accent-danger/35 bg-accent-danger/10 px-4 py-3 text-sm font-medium text-accent-danger">
            {error}
          </div>
        )}

        <label className="mb-6 block">
          <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            Server URL <span className="text-accent-danger">*</span>
          </span>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            className="input-field mt-2"
            placeholder="73.45.123.99:8080 or chat.example.com"
            autoFocus
          />
        </label>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Connecting...' : 'Connect'}
        </button>
      </form>
    </div>
  );
}
