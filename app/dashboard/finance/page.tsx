import React, { Suspense } from 'react';

async function FinancePage() {
  // Empty state - no financial data available yet
  const stats = {
    revenue: '₹0',
    expenses: '₹0',
    netProfit: '₹0',
    profitMargin: '0%',
  };

  const revenueByChannel: any[] = [];
  const expenseBreakdown: any[] = [];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Finance</h1>
        <p className="text-sm text-gray-600 mt-1">Financial overview and accounting</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Revenue (This Month)</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats.revenue}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Expenses</h3>
          <p className="text-3xl font-bold text-orange-600 mt-2">{stats.expenses}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Net Profit</h3>
          <p className="text-3xl font-bold text-dough-brown-600 mt-2">{stats.netProfit}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h3 className="text-sm font-medium text-gray-600">Profit Margin</h3>
          <p className="text-3xl font-bold text-gold-accent-500 mt-2">{stats.profitMargin}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Revenue by Channel</h2>
          {revenueByChannel.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-500 text-lg font-medium">No revenue data</p>
              <p className="text-gray-400 text-sm mt-2">Revenue breakdown will appear here once sales are recorded</p>
            </div>
          ) : (
            <div className="space-y-3">
              {revenueByChannel.map((item, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium text-gray-900 text-sm">{item.channel}</span>
                    <span className="font-bold text-gray-900">{item.revenue}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gold-accent-500 h-2 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Expense Breakdown</h2>
          {expenseBreakdown.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-500 text-lg font-medium">No expense data</p>
              <p className="text-gray-400 text-sm mt-2">Expense breakdown will appear here once expenses are recorded</p>
            </div>
          ) : (
            <div className="space-y-3">
              {expenseBreakdown.map((item, idx) => (
                <div key={idx} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium text-gray-900 text-sm">{item.category}</span>
                    <span className="font-bold text-orange-600">{item.amount}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function FinancePageWrapper() {
  return (
    <Suspense fallback={<FinanceSkeleton />}>
      <FinancePage />
    </Suspense>
  );
}

function FinanceSkeleton() {
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
