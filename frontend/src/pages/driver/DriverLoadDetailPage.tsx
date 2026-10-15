import React from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Upload, Download } from 'lucide-react';
import { useLoad, useLoadDocuments, useUpdateLoadStatus } from '../../hooks/useLoads';
import { documentsApi } from '../../api/documents';

const labels: Record<string, string> = { pending: 'Pending', dispatched: 'Dispatched', in_transit: 'In Transit', delivered: 'Delivered' };
const nextStatus: Record<string, { status: string; label: string }> = {
  dispatched: { status: 'in_transit', label: 'Start Trip' },
  in_transit: { status: 'delivered', label: 'Complete Delivery' },
};

const DriverLoadDetailPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useLoad(id);
  const { data: documentsResponse } = useLoadDocuments(id);
  const { mutate: updateStatus, isPending: isUpdating } = useUpdateLoadStatus();
  const load: any = data;
  const stops = load?.stops || [];
  const pickup = stops.find((stop: any) => stop.stop_type === 'PICKUP');
  const delivery = stops.find((stop: any) => stop.stop_type === 'DELIVERY');
  const action = load ? nextStatus[load.status] : undefined;
  const documents = documentsResponse?.data || [];

  const downloadDocument = async (document: any) => {
    try {
      const blob = await documentsApi.downloadDocument(document.id);
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.original_filename || 'load-document';
      link.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error('Failed to download document', downloadError);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Loading load details...</div>;
  if (error || !load) return <div className="p-8 text-center text-red-600">Load not found or not assigned to you.</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="bg-white px-4 py-4 sticky top-0 z-20 shadow-sm flex items-center"><button onClick={() => navigate('/driver/loads')} className="p-2 -ml-2 mr-3 text-gray-600"><ArrowLeft /></button><h1 className="text-xl font-bold text-gray-900 flex-1">Load #{load.load_number}</h1><span className="bg-blue-100 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full uppercase">{labels[load.status] || load.status}</span></header>
      <main className="p-4 space-y-4">
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100"><h2 className="text-lg font-bold text-gray-800 mb-6">Route Details</h2><div className="relative pl-8"><div className="absolute left-3 top-2 bottom-6 w-0.5 bg-gray-200" /><div className="relative mb-8"><div className="absolute -left-8 top-1 w-4 h-4 rounded-full border-[3px] border-blue-500 bg-white" /><p className="text-xs text-blue-600 uppercase tracking-wide font-bold mb-1">Pickup</p><p className="font-bold text-gray-900 text-lg">{pickup?.facility_name || pickup?.city || '—'}</p><p className="text-sm text-gray-500">{pickup ? `${pickup.address_line1 || ''}, ${pickup.city || ''}, ${pickup.state || ''}` : '—'}</p></div><div className="relative"><div className="absolute -left-8 top-1 w-4 h-4 rounded-full border-[3px] border-blue-500 bg-blue-500" /><p className="text-xs text-blue-600 uppercase tracking-wide font-bold mb-1">Delivery</p><p className="font-bold text-gray-900 text-lg">{delivery?.facility_name || delivery?.city || '—'}</p><p className="text-sm text-gray-500">{delivery ? `${delivery.address_line1 || ''}, ${delivery.city || ''}, ${delivery.state || ''}` : '—'}</p></div></div></section>
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100"><h2 className="text-lg font-bold text-gray-800 mb-4">Cargo Information</h2><div className="grid grid-cols-2 gap-4"><div><p className="text-xs text-gray-500">Commodity</p><p className="font-bold text-gray-900">{load.commodity || '—'}</p></div><div><p className="text-xs text-gray-500">Weight</p><p className="font-bold text-gray-900">{load.weight ? `${load.weight} ${load.weight_unit || 'LBS'}` : '—'}</p></div></div></section>
        <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100"><div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold text-gray-800">Documents</h2><Link to={`/driver/loads/${id}/upload`} className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-2 rounded-xl text-sm font-semibold"><Upload size={16} /> Upload</Link></div>{documents.length === 0 ? <p className="text-sm text-gray-500">No documents available.</p> : documents.map((document: any) => <button key={document.id} type="button" onClick={() => downloadDocument(document)} className="flex w-full items-center gap-3 py-2 text-left text-sm text-blue-700"><Download size={16} />{document.original_filename || document.file_name}</button>)}</section>
      </main>
      {action && <div className="fixed bottom-20 sm:bottom-6 left-4 right-4"><button onClick={() => updateStatus({ id, status: action.status })} disabled={isUpdating} className="w-full bg-blue-600 text-white font-bold text-lg py-4 rounded-2xl shadow-xl disabled:opacity-50">{isUpdating ? 'Updating...' : action.label}</button></div>}
+    </div>
  );
};

export default DriverLoadDetailPage;
export { DriverLoadDetailPage };
