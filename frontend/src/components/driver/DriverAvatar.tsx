import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { driversApi } from '../../api/drivers';
import { DriverProfile } from '../../types/driverProfile';

interface DriverAvatarProps {
  driver?: DriverProfile | null;
  className: string;
}

export const DriverAvatar: React.FC<DriverAvatarProps> = ({ driver, className }) => {
  const photo = useQuery({
    queryKey: ['driver-profile-photo', driver?.id],
    queryFn: driversApi.getMyProfilePhoto,
    enabled: Boolean(driver?.id && driver.has_profile_photo),
    retry: false,
  });
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    if (!photo.data) {
      setPhotoUrl(null);
      return;
    }
    const url = URL.createObjectURL(photo.data);
    setPhotoUrl(url);
    setImageFailed(false);
    return () => URL.revokeObjectURL(url);
  }, [photo.data]);

  const initials = `${driver?.first_name?.trim().charAt(0) || ''}${driver?.last_name?.trim().charAt(0) || ''}`.toUpperCase() || 'D';
  const name = [driver?.first_name, driver?.last_name].filter((part) => part?.trim()).join(' ') || 'Driver';

  if (photoUrl && !imageFailed) {
    return <img src={photoUrl} alt={`${name} profile`} className={`${className} rounded-full object-cover`} onError={() => setImageFailed(true)} />;
  }

  return (
    <span className={`${className} inline-flex items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700`} role="img" aria-label={`${name} profile picture`}>
      {initials}
    </span>
  );
};

export default DriverAvatar;
