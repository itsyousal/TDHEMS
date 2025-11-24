'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { ArrowUp, ArrowDown } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    direction: 'up' | 'down';
    period: string;
  };
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  isLoading?: boolean;
}

const variantStyles = {
  default: {
    bg: 'bg-blue-50',
    icon: 'text-blue-600',
    text: 'text-blue-900',
  },
  success: {
    bg: 'bg-green-50',
    icon: 'text-green-600',
    text: 'text-green-900',
  },
  warning: {
    bg: 'bg-yellow-50',
    icon: 'text-yellow-600',
    text: 'text-yellow-900',
  },
  error: {
    bg: 'bg-red-50',
    icon: 'text-red-600',
    text: 'text-red-900',
  },
  info: {
    bg: 'bg-purple-50',
    icon: 'text-purple-600',
    text: 'text-purple-900',
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  isLoading = false,
}: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        {/* Left Section */}
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>

          {isLoading ? (
            <div className="h-8 w-24 mt-2 bg-gray-200 rounded animate-pulse" />
          ) : (
            <div>
              <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
              {subtitle && (
                <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
              )}
            </div>
          )}

          {/* Trend Indicator */}
          {!isLoading && trend !== undefined && (
            <div className="flex items-center space-x-1 mt-3">
              {trend === null ? (
                <span className="text-xs text-gray-400 italic">Insufficient data for trend</span>
              ) : (
                <>
                  {trend.direction === 'up' ? (
                    <ArrowUp size={14} className="text-green-600" />
                  ) : (
                    <ArrowDown size={14} className="text-red-600" />
                  )}
                  <span
                    className={`text-sm font-medium ${trend.direction === 'up' ? 'text-green-600' : 'text-red-600'
                      }`}
                  >
                    {trend.value}%
                  </span>
                  <span className="text-xs text-gray-500">{trend.period}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* Icon Section */}
        {Icon && (
          <div className={`${styles.bg} p-3 rounded-lg`}>
            <Icon size={24} className={styles.icon} />
          </div>
        )}
      </div>
    </div>
  );
}
