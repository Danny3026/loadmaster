import React, { useState, useRef } from 'react';
import { UploadCloud, FileText } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useCreateLoad } from '../../hooks/useLoads';
import { LOAD_TYPE_OPTIONS } from '../../constants/loadTypes';

interface CreateLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateLoadModal: React.FC<CreateLoadModalProps> = ({ isOpen, onClose }) => {
  const { mutate: createLoad, isPending } = useCreateLoad();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedFile, setExtractedFile] = useState<File | null>(null);

  const [formData, setFormData] = useState({
    // Deadhead
    deadheadCity: '',
    deadheadState: '',
    deadheadMiles: '',
    // Broker info
    loadNumber: '',
    loadType: '',
    brokerName: '',
    brokerMc: '',
    // Rate spec
    rate: '',
    miles: '',
    ratePerMile: '',
    weight: '',
    commodity: '',
    // Pickup
    pickupAddress: '',
    pickupCity: '',
    pickupState: '',
    pickupDate: '',
    pickupTime: '',
    pickupEndTime: '',
    pickupContact: '',
    pickupPhone: '',
    // Delivery
    deliveryAddress: '',
    deliveryCity: '',
    deliveryState: '',
    deliveryDate: '',
    deliveryTime: '',
    deliveryEndTime: '',
    deliveryContact: '',
    deliveryPhone: '',
    specialInstructions: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setExtractedFile(file);
      simulateAIAutoFill();
    }
  };

  const simulateAIAutoFill = () => {
    setIsExtracting(true);
    // Simulate API call for document extraction
    setTimeout(() => {
      setFormData(prev => ({
        ...prev,
        deadheadCity: 'Dallas',
        deadheadState: 'TX',
        deadheadMiles: '12.5',
        loadNumber: 'LD-' + Math.floor(Math.random() * 10000),
        loadType: 'DRY_VAN',
        brokerName: 'TQL',
        brokerMc: '',
        rate: '2500',
        miles: '1100',
        ratePerMile: '2.27',
        weight: '43000',
        commodity: 'Palletized Goods',
        pickupAddress: '123 Logistics Way',
        pickupCity: 'Houston',
        pickupState: 'TX',
        pickupDate: new Date().toISOString().split('T')[0],
        pickupTime: '08:00',
        pickupEndTime: '12:00',
        pickupContact: 'John Dispatch',
        pickupPhone: '555-0101',
        deliveryAddress: '456 Warehouse Blvd',
        deliveryCity: 'Atlanta',
        deliveryState: 'GA',
        deliveryDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        deliveryTime: '09:00',
        deliveryEndTime: '14:00',
        deliveryContact: 'Receiving Dept',
        deliveryPhone: '555-0202',
        specialInstructions: 'Must have clean trailer. Driver must wear safety vest.'
      }));
      setIsExtracting(false);
    }, 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Map the modal's detailed fields back to our backend structure
    createLoad(
      {
        loadNumber: formData.loadNumber,
        brokerReference: formData.brokerName,
        commodity: formData.commodity,
        rate: parseFloat(formData.rate) || 0,
        equipmentType: formData.loadType || 'DRY_VAN',
        specialInstructions: formData.specialInstructions,
        stops: [] // Stops logic would map pickup/delivery to stops array here
      },
      {
        onSuccess: () => onClose(),
      }
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Load" className="max-w-4xl h-[90vh] flex flex-col p-0 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-slate-200">
        
        {/* AI Upload Dropzone */}
        <div className="mb-8 relative">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.png,.jpg,.jpeg"
            className="hidden"
          />
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-200 rounded-xl p-8 bg-slate-50 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 transition-colors group"
          >
            {isExtracting ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                <p className="text-sm font-medium text-slate-600">AI is analyzing document...</p>
              </div>
            ) : extractedFile ? (
              <div className="flex flex-col items-center space-y-2">
                <div className="p-3 bg-green-100 rounded-full text-green-600">
                  <FileText className="h-8 w-8" />
                </div>
                <p className="text-sm font-medium text-slate-900">{extractedFile.name}</p>
                <p className="text-xs text-green-600 font-medium">Fields auto-filled successfully</p>
                <button className="text-xs text-blue-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  Upload different file
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-3">
                <div className="p-3 bg-white rounded-full text-slate-400 shadow-sm border border-slate-100 group-hover:text-blue-600 transition-colors">
                  <UploadCloud className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-slate-900">Upload Rate Confirmation PDF</p>
                  <p className="text-xs text-slate-500 mt-1">AI will auto-fill load details from the document</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <form id="create-load-form" onSubmit={handleSubmit} className="space-y-8">
          
          {/* Section: Starting Point */}
          <section>
            <h3 className="text-xs font-bold text-slate-500 tracking-wider mb-4 uppercase flex items-center gap-2">
              <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              Starting Point (Deadhead)
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                <input type="text" name="deadheadCity" value={formData.deadheadCity} onChange={handleChange} placeholder="e.g. Dallas" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none placeholder:text-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">State</label>
                <input type="text" name="deadheadState" value={formData.deadheadState} onChange={handleChange} placeholder="TX" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none placeholder:text-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Deadhead Miles</label>
                <input type="text" name="deadheadMiles" value={formData.deadheadMiles} onChange={handleChange} placeholder="Miles to 1st pic" className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none placeholder:text-slate-400" />
              </div>
            </div>
          </section>

          {/* Section: Load & Broker Info */}
          <section>
            <h3 className="text-xs font-bold text-slate-500 tracking-wider mb-4 uppercase">Load & Broker Info</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Load # *</label>
                <input type="text" name="loadNumber" value={formData.loadNumber} onChange={handleChange} placeholder="LD-001" required className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none placeholder:text-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Load Type</label>
                <select name="loadType" value={formData.loadType} onChange={handleChange} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none bg-white">
                  <option value="">Select...</option>
                  {LOAD_TYPE_OPTIONS.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Broker Name</label>
                <input type="text" name="brokerName" value={formData.brokerName} onChange={handleChange} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Broker MC#</label>
                <input type="text" name="brokerMc" value={formData.brokerMc} onChange={handleChange} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none" />
              </div>
            </div>
          </section>

          {/* Section: Rate & Specifications */}
          <section>
            <h3 className="text-xs font-bold text-slate-500 tracking-wider mb-4 uppercase">Rate & Specifications</h3>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Rate ($)</label>
                <input type="text" name="rate" value={formData.rate} onChange={handleChange} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Miles</label>
                <input type="text" name="miles" value={formData.miles} onChange={handleChange} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">$/Mile</label>
                <input type="text" name="ratePerMile" value={formData.ratePerMile} onChange={handleChange} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none bg-slate-50" readOnly />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Weight (lbs)</label>
                <input type="text" name="weight" value={formData.weight} onChange={handleChange} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Commodity</label>
              <input type="text" name="commodity" value={formData.commodity} onChange={handleChange} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none" />
            </div>
          </section>

          {/* Section: Pickup */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase">Pickup</h3>
              <button type="button" className="text-sm font-medium text-slate-900 flex items-center gap-1 hover:text-blue-600 transition-colors">
                <span className="text-lg leading-none mb-[2px]">+</span> Add Pickup
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Address</label>
                <input type="text" name="pickupAddress" value={formData.pickupAddress} onChange={handleChange} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none" />
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                  <input type="text" name="pickupCity" value={formData.pickupCity} onChange={handleChange} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">State</label>
                  <input type="text" name="pickupState" value={formData.pickupState} onChange={handleChange} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                  <input type="date" name="pickupDate" value={formData.pickupDate} onChange={handleChange} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Time</label>
                  <input type="time" name="pickupTime" value={formData.pickupTime} onChange={handleChange} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none bg-white" />
                  
                  <div className="mt-4">
                    <label className="block text-xs font-medium text-slate-700 mb-1">End time (range)</label>
                    <input type="time" name="pickupEndTime" value={formData.pickupEndTime} onChange={handleChange} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none bg-white" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Contact</label>
                  <input type="text" name="pickupContact" value={formData.pickupContact} onChange={handleChange} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
                  <input type="text" name="pickupPhone" value={formData.pickupPhone} onChange={handleChange} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none" />
                </div>
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Section: Delivery */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-slate-500 tracking-wider uppercase">Delivery</h3>
              <button type="button" className="text-sm font-medium text-slate-900 flex items-center gap-1 hover:text-blue-600 transition-colors">
                <span className="text-lg leading-none mb-[2px]">+</span> Add Delivery
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Address</label>
                <input type="text" name="deliveryAddress" value={formData.deliveryAddress} onChange={handleChange} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none" />
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">City</label>
                  <input type="text" name="deliveryCity" value={formData.deliveryCity} onChange={handleChange} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">State</label>
                  <input type="text" name="deliveryState" value={formData.deliveryState} onChange={handleChange} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
                  <input type="date" name="deliveryDate" value={formData.deliveryDate} onChange={handleChange} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none bg-white" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Time</label>
                  <input type="time" name="deliveryTime" value={formData.deliveryTime} onChange={handleChange} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none bg-white" />
                  
                  <div className="mt-4">
                    <label className="block text-xs font-medium text-slate-700 mb-1">End time (range)</label>
                    <input type="time" name="deliveryEndTime" value={formData.deliveryEndTime} onChange={handleChange} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none bg-white" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Contact</label>
                  <input type="text" name="deliveryContact" value={formData.deliveryContact} onChange={handleChange} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
                  <input type="text" name="deliveryPhone" value={formData.deliveryPhone} onChange={handleChange} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none" />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Special Instructions</label>
                <textarea name="specialInstructions" value={formData.specialInstructions} onChange={handleChange} rows={4} className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none resize-none" />
              </div>
            </div>
          </section>

        </form>
      </div>

      {/* Footer fixed at bottom */}
      <div className="border-t border-slate-200 p-4 bg-white flex justify-end gap-3 flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="border border-slate-300 text-slate-700 rounded-md py-2 px-5 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          form="create-load-form"
          disabled={isPending || isExtracting}
          className="bg-blue-600 text-white rounded-md py-2 px-6 text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Creating...' : 'Create Load'}
        </button>
      </div>
    </Modal>
  );
};
