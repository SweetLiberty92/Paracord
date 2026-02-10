import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Rocket, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { MIN_PASSWORD_LENGTH } from '../lib/constants';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (!agreed) {
      setError('You must agree to the terms of service');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await register(email, username, password, displayName);
      navigate('/app');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.04fr_0.96fr]">
        <div className="glass-panel hidden rounded-2xl border p-7 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-bg-mod-subtle px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">
              <Sparkles size={14} />
              Join the Community
            </div>
            <h2 className="max-w-sm text-3xl font-bold leading-tight text-text-primary">
              Create your identity and find your people.
            </h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-text-secondary">
              Set up your profile once, then jump into servers, voice rooms, and live conversations.
            </p>
          </div>
          <div className="space-y-2 pt-6">
            <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-mod-subtle/70 px-3 py-2.5 text-sm text-text-secondary">
              <Rocket size={16} className="text-accent-primary" />
              Onboard in minutes with unified profile settings
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border-subtle bg-bg-mod-subtle/70 px-3 py-2.5 text-sm text-text-secondary">
              <ShieldCheck size={16} className="text-accent-success" />
              Terms and privacy controls built into the flow
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-card">
          <div className="mb-7 text-center">
            <h1 className="text-3xl font-bold leading-tight text-text-primary">Create an account</h1>
            <p className="mt-1.5 text-sm text-text-muted">Pick your username and start hanging out.</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-accent-danger/35 bg-accent-danger/10 px-3 py-2.5 text-sm font-medium text-accent-danger">
              {error}
            </div>
          )}

          <label className="mb-4 block">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Email <span className="text-accent-danger">*</span>
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-field mt-1.5"
              placeholder="you@example.com"
            />
          </label>

          <label className="mb-4 block">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Display Name</span>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="input-field mt-1.5"
              placeholder="How people see you"
            />
          </label>

          <label className="mb-4 block">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Username <span className="text-accent-danger">*</span>
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="input-field mt-1.5"
              placeholder="Unique account handle"
            />
          </label>

          <label className="mb-4 block">
            <span className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
              Password <span className="text-accent-danger">*</span>
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={MIN_PASSWORD_LENGTH}
              className="input-field mt-1.5"
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            />
          </label>

          <label className="mb-5 flex cursor-pointer items-start gap-2.5 rounded-xl border border-border-subtle bg-bg-mod-subtle/60 px-3 py-2.5">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-1 accent-[var(--accent-primary)]"
            />
            <span className="text-xs leading-5 text-text-muted">
              I have read and agree to the{' '}
              <Link to="/terms" className="font-semibold text-text-link hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="font-semibold text-text-link hover:underline">
                Privacy Policy
              </Link>
              .
            </span>
          </label>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account...' : 'Continue'}
          </button>

          <p className="mt-4 text-sm text-text-muted">
            <Link to="/login" className="font-semibold text-text-link hover:underline">
              Already have an account?
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
