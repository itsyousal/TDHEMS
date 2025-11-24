import React, { Suspense } from 'react';

async function AutomationPage() {
  // Empty state - no automation data available yet
  const stats = {
    activeRules: 0,
    workflows: 0,
    executionsToday: 0,
    successRate: '0%',
  };

  const rules: any[] = [];
  const executions: any[] = [];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Automation</h1>
        <p className="text-sm text-gray-600 mt-1">Workflow automation and rules engine</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Active Rules</h3>
          <p className="text-3xl font-bold text-dough-brown-600 mt-2">{stats.activeRules}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Workflows</h3>
          <p className="text-3xl font-bold text-gold-accent-500 mt-2">{stats.workflows}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Executions Today</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats.executionsToday}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Success Rate</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{stats.successRate}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Automation Rules</h2>
          {rules.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="text-gray-500 text-lg font-medium">No automation rules configured</p>
              <p className="text-gray-400 text-sm mt-2">Automation rules will appear here once created</p>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{rule.name}</p>
                      <p className="text-xs text-gray-600 mt-1">Trigger: {rule.trigger}</p>
                    </div>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      {rule.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Recent Executions</h2>
          {executions.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <p className="text-gray-500 text-lg font-medium">No execution history</p>
              <p className="text-gray-400 text-sm mt-2">Automation execution logs will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {executions.map((exec, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-medium text-gray-900 text-sm">{exec.rule}</p>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-800">
                      ✓ Success
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">{exec.count} executions • {exec.time}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function AutomationPageWrapper() {
  return (
    <Suspense fallback={<AutomationSkeleton />}>
      <AutomationPage />
    </Suspense>
  );
}

function AutomationSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="mb-6">
        <div className="h-8 w-32 bg-gray-200 rounded mb-2" />
        <div className="h-4 w-64 bg-gray-200 rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-gray-200 rounded-lg" />
        ))}
      </div>
    </div>
  );
}
