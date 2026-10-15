import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

interface BreadcrumbItem {
  name: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav className="flex mb-4" aria-label="Breadcrumb">
      <ol role="list" className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
        <li>
          <div>
            <a href="#" className="hover:text-slate-900 dark:hover:text-slate-50">
              <Home className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="sr-only">Home</span>
            </a>
          </div>
        </li>
        {items.map((item, index) => (
          <li key={item.name}>
            <div className="flex items-center">
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <a
                href={item.href || '#'}
                className={`ml-2 text-sm font-medium ${
                  index === items.length - 1
                    ? 'text-slate-900 dark:text-slate-50 pointer-events-none'
                    : 'hover:text-slate-900 dark:hover:text-slate-50'
                }`}
                aria-current={index === items.length - 1 ? 'page' : undefined}
              >
                {item.name}
              </a>
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}
