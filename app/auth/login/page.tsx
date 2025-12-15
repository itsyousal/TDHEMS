'use client';

import Link from 'next/link';
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
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo and Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-xl bg-white border border-neutral-200 text-neutral-900 font-bold text-2xl mb-4 shadow-sm">
            DH
          </div>
          <h1 className="text-3xl font-bold text-gray-900">The Dough House</h1>
          <p className="text-gray-500 mt-2">Enterprise Management System</p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-xl shadow-lg p-8 border border-neutral-200">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Sign In</h2>

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
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg bg-neutral-50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-dough-brown-300 focus:border-transparent transition"
                required
                disabled={isLoading}
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2 border border-neutral-300 rounded-lg bg-neutral-50 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-dough-brown-300 focus:border-transparent transition"
                required
                disabled={isLoading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 px-4 py-2 bg-dough-brown-100 text-dough-brown-900 font-medium rounded-lg hover:bg-dough-brown-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center space-x-2"
            >
              <LogIn size={18} />
              <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
            </button>
          </form>
        </div>

        {/* Quick Access & Support */}
        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gray-600">
            Everyone can view the public order portal and the POS page without logging in.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/order"
              className="border border-dough-brown-100 bg-white text-dough-brown-900 font-medium rounded-lg px-4 py-2 hover:bg-dough-brown-50 transition"
            >
              Open Customer Order Portal
            </Link>
          </div>
          <p className="text-sm text-gray-500">
            For support, contact{' '}
            <a href="mailto:support@doughhouse.local" className="text-dough-brown-600 hover:underline font-medium">
              support@doughhouse.local
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
