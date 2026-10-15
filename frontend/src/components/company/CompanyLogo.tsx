import React, { useState } from 'react';

interface CompanyLogoProps {
  logoUrl?: string | null;
  companyName?: string | null;
  className: string;
  fallbackClassName: string;
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({
  logoUrl,
  companyName,
  className,
  fallbackClassName,
}) => {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const name = companyName?.trim() || 'Company';

  if (logoUrl && failedUrl !== logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className={className}
        onError={() => setFailedUrl(logoUrl)}
      />
    );
  }

  return (
    <div className={fallbackClassName} role="img" aria-label={`${name} logo unavailable`}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
};