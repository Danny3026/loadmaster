import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CompanyLogo } from './CompanyLogo';

describe('CompanyLogo', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  it('shows the saved logo and switches to a clean company initial if it fails to load', async () => {
    await act(async () => root.render(
      <CompanyLogo
        logoUrl="/storage/company-logo.png"
        companyName="Danny Transport"
        className="logo-image"
        fallbackClassName="logo-fallback"
      />
    ));

    expect(container.querySelector('img')?.getAttribute('src')).toBe('/storage/company-logo.png');
    await act(async () => {
      container.querySelector('img')?.dispatchEvent(new Event('error'));
    });

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[role="img"]')?.textContent).toBe('D');
  });

  it('shows the fallback when no company logo is saved', async () => {
    await act(async () => root.render(
      <CompanyLogo
        companyName="Danny Transport"
        className="logo-image"
        fallbackClassName="logo-fallback"
      />
    ));

    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[role="img"]')?.textContent).toBe('D');
  });
});