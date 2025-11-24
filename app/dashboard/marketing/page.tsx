import React, { Suspense } from 'react';

async function MarketingPage() {
  // Empty state - no marketing data available yet
  const stats = {
    activeCampaigns: 0,
    emailOpenRate: '0%',
    conversionRate: '0%',
    roi: '0%',
  };

  const campaigns: any[] = [];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Marketing</h1>
        <p className="text-sm text-gray-600 mt-1">Campaign management and customer engagement</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Active Campaigns</h3>
          <p className="text-3xl font-bold text-dough-brown-600 mt-2">{stats.activeCampaigns}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Email Opens</h3>
          <p className="text-3xl font-bold text-gold-accent-500 mt-2">{stats.emailOpenRate}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Conversion Rate</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats.conversionRate}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">ROI</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{stats.roi}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Recent Campaigns</h2>
        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            <p className="text-gray-500 text-lg font-medium">No marketing campaigns available</p>
            <p className="text-gray-400 text-sm mt-2">Marketing campaigns will appear here once created</p>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900">{campaign.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">Sent to {campaign.sent} • Opens: {campaign.opens}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${campaign.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                    {campaign.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export default function MarketingPageWrapper() {
  return (
    <Suspense fallback={<MarketingSkeleton />}>
      <MarketingPage />
    </Suspense>
  );
}

function MarketingSkeleton() {
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
