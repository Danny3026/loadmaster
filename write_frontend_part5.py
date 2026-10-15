import os

base_dir = r"C:\Users\Chanda Mfilinge\.gemini\antigravity\scratch\loadmaster\frontend"

files = {}

files["src/hooks/useLoads.ts"] = """
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Load } from '../types';
import { apiClient } from '../api/client';

export const useLoads = () => {
  return useQuery({
    queryKey: ['loads'],
    queryFn: async () => {
      // Fake API call for now to allow previewing UI
      return [
        { id: '1', loadNumber: 'L-1001', status: 'IN_TRANSIT', rate: 1200, brokerId: 'B1', stops: [] },
        { id: '2', loadNumber: 'L-1002', status: 'NEW', rate: 850, brokerId: 'B2', stops: [] },
        { id: '3', loadNumber: 'L-1003', status: 'COMPLETED', rate: 2100, brokerId: 'B1', stops: [] },
      ] as any[];
    }
  });
};

export const useLoad = (id: string) => {
  return useQuery({
    queryKey: ['loads', id],
    queryFn: async () => {
      return { id, loadNumber: `L-${id}`, status: 'IN_TRANSIT', rate: 1200, brokerId: 'B1', stops: [] } as any;
    }
  });
};
"""

files["src/hooks/useAuth.ts"] = """
export { useAuth } from '../contexts/AuthContext';
"""

files["src/components/loads/LoadStatusBadge.tsx"] = """
import React from 'react';
import { LoadStatus } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { LOAD_STATUS_CONFIG } from '@/utils/constants';

interface LoadStatusBadgeProps {
  status: LoadStatus;
  className?: string;
}

export const LoadStatusBadge: React.FC<LoadStatusBadgeProps> = ({ status, className }) => {
  const config = LOAD_STATUS_CONFIG[status] || { label: status, color: 'bg-slate-100 text-slate-700 border-slate-200' };
  
  return (
    <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${config.color} ${className}`}>
      {config.label}
    </div>
  );
};
"""

files["src/pages/admin/LoadsPage.tsx"] = """
import React from 'react';
import { useLoads } from '@/hooks/useLoads';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadStatusBadge } from '@/components/loads/LoadStatusBadge';
import { Plus, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const LoadsPage = () => {
  const { data: loads, isLoading } = useLoads();
  const navigate = useNavigate();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Loads</h1>
          <p className="text-slate-500 text-sm mt-1">Manage active and historical loads</p>
        </div>
        <Button onClick={() => navigate('/loads/new')} leftIcon={<Plus className="h-4 w-4" />}>
          Create Load
        </Button>
      </div>

      <Card>
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 bg-slate-50/50 rounded-t-xl">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search load number, broker, or location..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
            />
          </div>
          <Button variant="outline" leftIcon={<Filter className="h-4 w-4" />}>
            Filters
          </Button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 font-medium">Load #</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Broker</th>
                <th className="px-6 py-4 font-medium">Pickup</th>
                <th className="px-6 py-4 font-medium">Delivery</th>
                <th className="px-6 py-4 font-medium text-right">Rate</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-500">Loading data...</td></tr>
              ) : loads?.map((load: any) => (
                <tr key={load.id} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4 font-medium text-slate-900">{load.loadNumber}</td>
                  <td className="px-6 py-4">
                    <LoadStatusBadge status={load.status} />
                  </td>
                  <td className="px-6 py-4 text-slate-600">Broker Name</td>
                  <td className="px-6 py-4 text-slate-600">Chicago, IL<br/><span className="text-xs text-slate-400">Oct 12, 08:00 AM</span></td>
                  <td className="px-6 py-4 text-slate-600">Dallas, TX<br/><span className="text-xs text-slate-400">Oct 14, 05:00 PM</span></td>
                  <td className="px-6 py-4 text-right font-medium text-slate-900">${load.rate}</td>
                  <td className="px-6 py-4 text-right">
                    <Button variant="ghost" size="sm" onClick={() => navigate(`/loads/${load.id}`)}>
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
"""

files["src/pages/admin/CreateLoadPage.tsx"] = """
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useNavigate } from 'react-router-dom';

export const CreateLoadPage = () => {
  const navigate = useNavigate();
  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Create New Load</h1>
        <Button variant="outline" onClick={() => navigate('/loads')}>Cancel</Button>
      </div>
      
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-12">
            <h3 className="text-lg font-medium text-slate-900 mb-2">Upload Rate Confirmation</h3>
            <p className="text-slate-500 mb-6">Upload a PDF to automatically extract load details, or enter them manually.</p>
            <div className="flex justify-center gap-4">
              <Button>Upload Document</Button>
              <Button variant="outline">Manual Entry</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
"""

files["src/pages/admin/LoadDetailPage.tsx"] = """
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLoad } from '@/hooks/useLoads';
import { Button } from '@/components/ui/Button';
import { LoadStatusBadge } from '@/components/loads/LoadStatusBadge';
import { ArrowLeft, MapPin, Truck, Calendar, DollarSign } from 'lucide-react';

export const LoadDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: load, isLoading } = useLoad(id || '');

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/loads')} className="text-slate-500 -ml-3">
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900">{load?.loadNumber}</h1>
            <LoadStatusBadge status={load?.status} />
          </div>
          <p className="text-slate-500">Broker: TQL • Created Oct 10, 2023</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Edit</Button>
          <Button variant="primary">Dispatch Driver</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-primary-50 p-3 rounded-lg text-primary-600"><DollarSign className="h-5 w-5" /></div>
          <div><p className="text-sm text-slate-500">Rate</p><p className="font-semibold text-slate-900">${load?.rate}</p></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-lg text-amber-600"><MapPin className="h-5 w-5" /></div>
          <div><p className="text-sm text-slate-500">Stops</p><p className="font-semibold text-slate-900">2 Stops</p></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-lg text-blue-600"><Truck className="h-5 w-5" /></div>
          <div><p className="text-sm text-slate-500">Driver</p><p className="font-semibold text-slate-900">John Doe</p></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-purple-50 p-3 rounded-lg text-purple-600"><Calendar className="h-5 w-5" /></div>
          <div><p className="text-sm text-slate-500">Est. Completion</p><p className="font-semibold text-slate-900">Oct 14</p></div>
        </div>
      </div>
    </div>
  );
};
"""

for path, content in files.items():
    full_path = os.path.join(base_dir, path)
    os.makedirs(os.path.dirname(full_path), exist_ok=True)
    with open(full_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + '\\n')

print("Part 5 written")
