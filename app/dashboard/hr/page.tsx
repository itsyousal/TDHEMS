'use client';

import React from 'react';
import { Users, Briefcase, Award, TrendingUp } from 'lucide-react';

export default function HRPage() {
  // Empty state - no employee data available yet
  const stats = {
    totalEmployees: 0,
    activeDepartments: 0,
    newHires: 0,
    performanceReviews: 0,
  };

  const employees: any[] = [];

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Human Resources</h1>
        <p className="text-sm text-gray-600 mt-1">Employee management and HR operations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Employees</p>
              <p className="text-3xl font-bold text-dough-brown-600 mt-2">{stats.totalEmployees}</p>
            </div>
            <Users className="w-10 h-10 text-dough-brown-200" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Departments</p>
              <p className="text-3xl font-bold text-gold-accent-600 mt-2">{stats.activeDepartments}</p>
            </div>
            <Briefcase className="w-10 h-10 text-gold-accent-200" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">New Hires (30d)</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats.newHires}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-green-200" />
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Performance Reviews</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{stats.performanceReviews}</p>
            </div>
            <Award className="w-10 h-10 text-blue-200" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Recent Employees</h2>
        {employees.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">No employee data available</p>
            <p className="text-gray-400 text-sm mt-2">Employee records will appear here once added to the system</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Department</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Status</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Hire Date</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">{emp.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{emp.email}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{emp.dept}</td>
                    <td className="py-3 px-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${emp.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                        {emp.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{emp.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
