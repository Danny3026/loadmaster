import React, { useRef, useState } from 'react';
import { ArrowLeft, UploadCloud } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLoad, useUploadLoadDocument } from '../../hooks/useLoads';

const DriverUploadPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [docType, setDocType] = useState('POD');
  const [file, setFile] = useState<File | null>(null);
  const { data: load } = useLoad(id);
  const { mutate: upload, isPending } = useUploadLoadDocument();
  const stops = (load as any)?.stops || [];
  const pickup = stops.find((stop: any) => stop.stop_type === 'PICKUP');
  const delivery = stops.find((stop: any) => stop.stop_type === 'DELIVERY');

  const submit = () => {
    if (!file || !id) return;
    upload({ id, file, documentType: docType }, {
      onSuccess: () => navigate(`/driver/loads/${id}`),
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <header className="sticky top-0 z-20 flex items-center bg-white px-4 py-4 shadow-sm">
        <button onClick={() => navigate(`/driver/loads/${id}`)} className="mr-3 p-2 text-gray-600" aria-label="Back">
          <ArrowLeft />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Upload Document</h1>
      </header>
      <main className="space-y-6 p-4">
        <section>
          <p className="mb-3 text-sm font-bold text-gray-700">Related Load</p>
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <p className="font-semibold text-gray-900">Load #{(load as any)?.load_number || id}</p>
            <p className="mt-1 text-sm text-gray-500">
              {pickup?.city || '—'}, {pickup?.state || ''} → {delivery?.city || '—'}, {delivery?.state || ''}
            </p>
          </div>
        </section>
        <section>
          <p className="mb-3 text-sm font-bold text-gray-700">Document Type</p>
          <div className="grid grid-cols-2 gap-3">
            {['POD', 'BOL', 'RATE_CONFIRMATION', 'OTHER'].map((type) => (
              <button key={type} onClick={() => setDocType(type)} className={`rounded-2xl border-2 py-3 text-sm font-medium ${docType === type ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-transparent bg-white text-gray-600 shadow-sm'}`}>
                {type.replace('_', ' ')}
              </button>
            ))}
          </div>
        </section>
        <section>
          <input ref={inputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden" onChange={(event) => setFile(event.target.files?.[0] || null)} />
          <button type="button" onClick={() => inputRef.current?.click()} className="flex min-h-[220px] w-full flex-col items-center justify-center rounded-3xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-8 text-center">
            <UploadCloud className="mb-4 text-blue-600" size={48} />
            <h2 className="text-lg font-bold text-gray-900">{file ? file.name : 'Select a document'}</h2>
            <p className="mt-1 text-sm text-gray-500">Choose a PDF or photo from your device.</p>
          </button>
        </section>
      </main>
      <div className="fixed bottom-6 left-4 right-4">
        <button onClick={submit} disabled={!file || isPending} className="w-full rounded-2xl bg-blue-600 py-4 text-lg font-bold text-white shadow-xl disabled:opacity-50">
          {isPending ? 'Uploading...' : 'Submit Document'}
        </button>
      </div>
    </div>
  );
};

export default DriverUploadPage;
export { DriverUploadPage };
