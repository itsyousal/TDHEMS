import React, { Suspense } from 'react';
import { ChangePasswordForm } from '@/components/settings/change-password-form';

async function SettingsPage() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-600 mt-1">System settings and configuration</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Organization Settings */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-6 text-gray-900">Organization Settings</h2>

          <div className="space-y-6">
            {/* Organization Info */}
            <div>
              <h3 className="font-medium text-gray-900 mb-4">Organization Information</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Organization Name</label>
                  <input
                    type="text"
                    defaultValue="The Dough House"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    defaultValue="info@doughhouse.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                    disabled
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                  <input
                    type="tel"
                    defaultValue="+91 9876543210"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-900"
                    disabled
                  />
                </div>
              </div>
            </div>

            <hr className="my-6" />

            {/* System Settings */}
            <div>
              <h3 className="font-medium text-gray-900 mb-4">System Settings</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Maintenance Mode</label>
                  <input type="checkbox" className="w-4 h-4" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Enable Backups</label>
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Email Notifications</label>
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-6">
          <ChangePasswordForm />

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">Support</h2>
            <div className="space-y-3">
              <a href="#" className="flex items-center text-dough-brown-600 hover:text-dough-brown-700 text-sm">
                <span className="mr-2">→</span> Documentation
              </a>
              <a href="#" className="flex items-center text-dough-brown-600 hover:text-dough-brown-700 text-sm">
                <span className="mr-2">→</span> API Reference
              </a>
              <a href="#" className="flex items-center text-dough-brown-600 hover:text-dough-brown-700 text-sm">
                <span className="mr-2">→</span> Contact Support
              </a>
              <a href="#" className="flex items-center text-dough-brown-600 hover:text-dough-brown-700 text-sm">
                <span className="mr-2">→</span> Changelog
              </a>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">System Status</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Database</span>
                <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Cache</span>
                <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">Online</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">API</span>
                <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">Online</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function SettingsPageWrapper() {
  return (
    <Suspense fallback={<SettingsSkeleton />}>
      <SettingsPage />
    </Suspense>
  );
}

function SettingsSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-8 w-32 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-64 bg-gray-200 rounded" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-96 bg-gray-200 rounded-lg" />
        <div className="space-y-6">
          <div className="h-48 bg-gray-200 rounded-lg" />
          <div className="h-48 bg-gray-200 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
