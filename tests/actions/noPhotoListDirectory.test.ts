import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runNoPhotoList } from '@/actions/noPhotoList';
import * as fileUtils from '@/utils/fileUtils';
import * as storageUtils from '@/utils/security/storageUtils';

describe('noPhotoList - Church Directory photo scan', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('should list Church Directory members whose portrait endpoint is missing', async () => {
    const downloadCsvSpy = vi.spyOn(fileUtils, 'downloadCsv').mockImplementation(() => {});
    vi.spyOn(storageUtils, 'getPhotoCache').mockResolvedValue({});
    vi.spyOn(storageUtils, 'updatePhotoCache').mockResolvedValue();

    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: new URL(
        'https://directory.churchofjesuschrist.org/?unit=12345'
      ) as unknown as Location,
      writable: true,
      configurable: true,
    });

    const mockHouseholds = [
      {
        members: [
          {
            uuid: 'member-dir-photo',
            displayName: 'Alex Taylor',
            givenName: 'Alex',
            surname: 'Taylor',
          },
          {
            uuid: 'member-dir-none',
            displayName: 'Chris Miller',
            givenName: 'Chris',
            surname: 'Miller',
          },
          {
            uuid: 'member-dir-private',
            displayName: 'Private Member',
            givenName: 'Private',
            surname: 'Member',
            privacy: { photo: 'PRIVATE' },
          },
        ],
      },
    ];

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('households')) {
        return {
          ok: true,
          json: async () => mockHouseholds,
        } as Response;
      }
      if (url.includes('member-dir-none')) {
        return { ok: false, status: 404 } as Response;
      }
      return { ok: true, status: 200 } as Response;
    });

    const actionPromise = runNoPhotoList();
    await vi.waitFor(() => {
      expect(document.querySelector('.lcr-tools-confirm-modal')).not.toBeNull();
    });
    document.querySelector<HTMLButtonElement>('#lcr-tools-confirm-btn')?.click();
    const result = await actionPromise;

    expect(result.success).toBe(true);
    expect(result.data?.missingCount).toBe(1);
    expect(downloadCsvSpy).toHaveBeenCalledTimes(1);
    const [csvContent] = downloadCsvSpy.mock.calls[0];
    expect(csvContent).toContain('Chris');
    expect(csvContent).toContain('Miller');
    expect(csvContent).not.toContain('Alex');
    expect(csvContent).not.toContain('Private');

    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it('should classify members as missing photos when endpoint returns 200 SVG silhouette', async () => {
    const downloadCsvSpy = vi.spyOn(fileUtils, 'downloadCsv').mockImplementation(() => {});
    vi.spyOn(storageUtils, 'getPhotoCache').mockResolvedValue({});
    vi.spyOn(storageUtils, 'updatePhotoCache').mockResolvedValue();

    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: new URL(
        'https://directory.churchofjesuschrist.org/?unit=12345'
      ) as unknown as Location,
      writable: true,
      configurable: true,
    });

    const mockHouseholds = [
      {
        members: [
          {
            uuid: 'member-svg-silhouette',
            displayName: 'Morgan Lee',
            givenName: 'Morgan',
            surname: 'Lee',
          },
        ],
      },
    ];

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('households')) {
        return { ok: true, json: async () => mockHouseholds } as Response;
      }
      return {
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name.toLowerCase() === 'content-type' ? 'image/svg+xml' : null),
        },
      } as unknown as Response;
    });

    const actionPromise = runNoPhotoList();
    await vi.waitFor(() => {
      expect(document.querySelector('.lcr-tools-confirm-modal')).not.toBeNull();
    });
    document.querySelector<HTMLButtonElement>('#lcr-tools-confirm-btn')?.click();
    const result = await actionPromise;

    expect(result.success).toBe(true);
    expect(result.data?.missingCount).toBe(1);
    expect(downloadCsvSpy).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it('should classify members as missing photos when redirected to placeholder silhouette URL', async () => {
    const downloadCsvSpy = vi.spyOn(fileUtils, 'downloadCsv').mockImplementation(() => {});
    vi.spyOn(storageUtils, 'getPhotoCache').mockResolvedValue({});
    vi.spyOn(storageUtils, 'updatePhotoCache').mockResolvedValue();

    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: new URL(
        'https://directory.churchofjesuschrist.org/?unit=12345'
      ) as unknown as Location,
      writable: true,
      configurable: true,
    });

    const mockHouseholds = [
      {
        members: [
          {
            uuid: 'member-redirect-placeholder',
            displayName: 'Robin Diaz',
            givenName: 'Robin',
            surname: 'Diaz',
          },
        ],
      },
    ];

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('households')) {
        return { ok: true, json: async () => mockHouseholds } as Response;
      }
      return {
        ok: true,
        status: 200,
        redirected: true,
        url: 'https://directory.churchofjesuschrist.org/assets/default-avatar.png',
        headers: { get: () => null },
      } as unknown as Response;
    });

    const actionPromise = runNoPhotoList();
    await vi.waitFor(() => {
      expect(document.querySelector('.lcr-tools-confirm-modal')).not.toBeNull();
    });
    document.querySelector<HTMLButtonElement>('#lcr-tools-confirm-btn')?.click();
    const result = await actionPromise;

    expect(result.success).toBe(true);
    expect(result.data?.missingCount).toBe(1);
    expect(downloadCsvSpy).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });
});
