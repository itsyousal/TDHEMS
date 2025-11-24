import React, { Suspense } from 'react';

async function CRMPage() {
  // Empty state - no CRM data available yet
  const stats = {
    totalLeads: 0,
    opportunities: 0,
    conversionRate: '0%',
    pipelineValue: '₹0',
  };

  const interactions: any[] = [];
  const pipeline: any[] = [];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">CRM</h1>
        <p className="text-sm text-gray-600 mt-1">Customer relationship management and interactions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Total Leads</h3>
          <p className="text-3xl font-bold text-dough-brown-600 mt-2">{stats.totalLeads}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Opportunities</h3>
          <p className="text-3xl font-bold text-gold-accent-500 mt-2">{stats.opportunities}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Conversion Rate</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats.conversionRate}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Pipeline Value</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{stats.pipelineValue}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Recent Interactions</h2>
          {interactions.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <p className="text-gray-500 text-lg font-medium">No customer interactions</p>
              <p className="text-gray-400 text-sm mt-2">Customer interactions will appear here once recorded</p>
            </div>
          ) : (
            <div className="space-y-4">
              {interactions.map((interaction, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{interaction.customer}</p>
                      <p className="text-xs text-gray-600 mt-1">{interaction.notes}</p>
                    </div>
                    <span className="text-xs text-gray-500">{interaction.date}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Sales Pipeline</h2>
          {pipeline.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="text-gray-500 text-lg font-medium">No pipeline data</p>
              <p className="text-gray-400 text-sm mt-2">Sales pipeline stages will appear here once configured</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pipeline.map((stage, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium text-gray-900 text-sm">{stage.stage}</span>
                    <span className="text-sm font-bold text-dough-brown-600">{stage.value}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-dough-brown-500 h-2 rounded-full"
                      style={{ width: `${(stage.count / 50) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{stage.count} deals</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function CRMPageWrapper() {
  return (
    <Suspense fallback={<CRMSkeleton />}>
      <CRMPage />
    </Suspense>
  );
}

function CRMSkeleton() {
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
