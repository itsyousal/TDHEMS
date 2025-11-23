'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { AlertCircle, LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error || 'Invalid credentials');
      } else if (result?.ok) {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dough-brown-900 to-dough-brown-700 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-xl bg-dough-brown-600 text-white font-bold text-2xl mb-4">
            DH
          </div>
          <h1 className="text-3xl font-bold text-white">The Dough House</h1>
          <p className="text-neutral-200 mt-2">Enterprise Management System</p>
        </div>

        {/* Login Form */}
        <div className="bg-neutral-800 rounded-xl shadow-lg p-8 border border-neutral-700">
          <h2 className="text-2xl font-semibold text-white mb-6">Sign In</h2>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-neutral-200 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2 border border-neutral-700 rounded-lg bg-neutral-700 text-white placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-dough-brown-400 focus:border-transparent transition"
                required
                disabled={isLoading}
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-neutral-200 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-neutral-700 rounded-lg bg-neutral-700 text-white placeholder:text-neutral-300 focus:outline-none focus:ring-2 focus:ring-dough-brown-400 focus:border-transparent transition"
                required
                disabled={isLoading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 px-4 py-2 bg-dough-brown-600 text-white font-medium rounded-lg hover:bg-dough-brown-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              <LogIn size={18} />
              <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-6 p-4 bg-neutral-700 border border-neutral-600 rounded-lg">
            <p className="text-xs font-medium text-neutral-200 mb-2">Demo Credentials:</p>
            <p className="text-xs text-neutral-100">
              Email: <span className="font-mono">admin@doughhouse.local</span>
            </p>
            <p className="text-xs text-neutral-100">
              Password: <span className="font-mono">password123</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-6">
          For support, contact{' '}
          <a href="mailto:support@doughhouse.local" className="text-dough-brown-600 hover:underline">
            support@doughhouse.local
          </a>
        </p>
      </div>
    </div>
  );
}
