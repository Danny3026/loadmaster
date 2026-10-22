import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, Upload } from 'lucide-react';
import { driversApi } from '../../api/drivers';
import { useToast } from '../../contexts/ToastContext';
import { DriverProfile } from '../../types/driverProfile';
import { DriverAvatar } from './DriverAvatar';

const MAX_PHOTO_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

interface DriverProfilePhotoProps {
  driver: DriverProfile;
}

export const DriverProfilePhoto: React.FC<DriverProfilePhotoProps> = ({ driver }) => {
  const queryClient = useQueryClient();
  const { showSuccess, showError } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => () => {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
  }, []);

  const selectPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0] || null;
    event.currentTarget.value = '';
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
      setPreviewUrl(null);
      setSelectedFile(null);
      showError('Choose a JPEG, PNG, or WebP image.');
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
      setPreviewUrl(null);
      setSelectedFile(null);
      showError('Profile photos must be 5 MB or smaller.');
      return;
    }

    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    const nextPreview = URL.createObjectURL(file);
    previewRef.current = nextPreview;
    setPreviewUrl(nextPreview);
    setSelectedFile(file);
  };

  const uploadPhoto = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadProgress(0);
    try {
      await driversApi.uploadMyProfilePhoto(selectedFile, (loaded, total) => {
        if (total) setUploadProgress(Math.min(100, Math.round((loaded / total) * 100)));
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['driver', 'me'] }),
        queryClient.invalidateQueries({ queryKey: ['driver-profile-photo', driver.id] }),
      ]);
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
      setPreviewUrl(null);
      setSelectedFile(null);
      showSuccess('Profile photo updated.');
    } catch (error: unknown) {
      const message = axios.isAxiosError(error) ? error.response?.data?.error?.message : undefined;
      showError(typeof message === 'string' ? message : 'Unable to upload your profile photo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="flex flex-col items-center gap-4 rounded-3xl border border-gray-100 bg-white p-5 shadow-sm sm:flex-row">
      <div className="relative">
        {previewUrl ? (
          <img src={previewUrl} alt="Selected profile photo preview" className="h-24 w-24 rounded-full object-cover ring-4 ring-blue-50" />
        ) : (
          <DriverAvatar driver={driver} className="h-24 w-24 text-2xl ring-4 ring-blue-50" />
        )}
        <span className="absolute bottom-0 right-0 rounded-full bg-blue-600 p-2 text-white" aria-hidden="true">
          <Camera size={16} />
        </span>
      </div>
      <div className="w-full flex-1 text-center sm:text-left">
        <h2 className="font-semibold text-gray-900">Profile photo</h2>
        <p className="mt-1 text-sm text-gray-500">JPEG, PNG, or WebP. Maximum size 5 MB.</p>
        <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={selectPhoto} disabled={uploading} />
            <Camera size={16} aria-hidden="true" />
            {driver.has_profile_photo ? 'Choose a new photo' : 'Choose a photo'}
          </label>
          {selectedFile && (
            <button type="button" onClick={uploadPhoto} disabled={uploading} className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
              <Upload size={16} aria-hidden="true" />
              {uploading ? 'Uploading...' : 'Save photo'}
            </button>
          )}
        </div>
        {uploading && (
          <div className="mt-3" role="status" aria-live="polite">
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full bg-blue-600 transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="mt-1 text-xs text-gray-500">{uploadProgress > 0 ? `${uploadProgress}% uploaded` : 'Uploading photo...'}</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default DriverProfilePhoto;
