import { LoadStatus } from '../types';

export const LOAD_STATUS_CONFIG = {
  [LoadStatus.PENDING]: { label: 'Pending', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  [LoadStatus.DISPATCHED]: { label: 'Dispatched', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  [LoadStatus.IN_TRANSIT]: { label: 'In Transit', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  [LoadStatus.DELIVERED]: { label: 'Delivered', color: 'bg-teal-50 text-teal-700 border-teal-200' },
};