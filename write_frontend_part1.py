import os

base_dir = r"C:\Users\Chanda Mfilinge\.gemini\antigravity\scratch\loadmaster\frontend"

files = {}

files["tailwind.config.js"] = """
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb', // Base primary
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        success: {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
        },
        warning: {
          50: '#fffbeb',
          500: '#f59e0b',
          600: '#d97706',
        },
        danger: {
          50: '#fef2f2',
          500: '#ef4444',
          600: '#dc2626',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
"""

files["vite.config.ts"] = """
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})
"""

files["tsconfig.json"] = """
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
"""

files["index.html"] = """
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <title>LoadMaster - Premium Dispatch System</title>
  </head>
  <body class="bg-slate-50 text-slate-900 font-sans antialiased">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
"""

files["src/index.css"] = """
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-slate-50 text-slate-900;
  }
}

@layer utilities {
  .glass {
    @apply bg-white/70 backdrop-blur-md border border-white/20 shadow-sm;
  }
  .glass-dark {
    @apply bg-slate-900/80 backdrop-blur-md border border-slate-700/50;
  }
  
  /* Custom Scrollbar */
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    @apply bg-slate-300 rounded-full;
  }
  ::-webkit-scrollbar-thumb:hover {
    @apply bg-slate-400;
  }
  .dark ::-webkit-scrollbar-thumb {
    @apply bg-slate-700;
  }
  
  .focus-ring {
    @apply focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 focus:ring-offset-1;
  }
}
"""

files["src/types/index.ts"] = """
export enum Role {
  ADMIN = 'ADMIN',
  DISPATCHER = 'DISPATCHER',
  DRIVER = 'DRIVER',
  BROKER = 'BROKER'
}

export enum LoadStatus {
  NEW = 'NEW',
  ASSIGNED = 'ASSIGNED',
  DISPATCHED = 'DISPATCHED',
  AT_PICKUP = 'AT_PICKUP',
  IN_TRANSIT = 'IN_TRANSIT',
  AT_DELIVERY = 'AT_DELIVERY',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  avatarUrl?: string;
}

export interface Load {
  id: string;
  loadNumber: string;
  status: LoadStatus;
  brokerId: string;
  driverId?: string;
  truckId?: string;
  rate: number;
  stops: LoadStop[];
  createdAt: string;
  updatedAt: string;
}

export interface LoadStop {
  id: string;
  type: 'PICKUP' | 'DELIVERY';
  sequence: number;
  locationName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  scheduledTime: string;
}
"""

files["src/utils/constants.ts"] = """
import { LoadStatus } from '../types';

export const LOAD_STATUS_CONFIG = {
  [LoadStatus.NEW]: { label: 'New', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  [LoadStatus.ASSIGNED]: { label: 'Assigned', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  [LoadStatus.DISPATCHED]: { label: 'Dispatched', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  [LoadStatus.AT_PICKUP]: { label: 'At Pickup', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  [LoadStatus.IN_TRANSIT]: { label: 'In Transit', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  [LoadStatus.AT_DELIVERY]: { label: 'At Delivery', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  [LoadStatus.DELIVERED]: { label: 'Delivered', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  [LoadStatus.COMPLETED]: { label: 'Completed', color: 'bg-green-50 text-green-700 border-green-200' },
  [LoadStatus.CANCELLED]: { label: 'Cancelled', color: 'bg-red-50 text-red-700 border-red-200' },
};
"""

files["src/utils/classNames.ts"] = """
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
"""

for path, content in files.items():
    full_path = os.path.join(base_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\\n")

print("Part 1 written")
