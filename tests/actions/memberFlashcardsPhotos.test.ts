import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runMemberFlashcards } from '@/actions/memberFlashcards';
import { flashcardMembersFromScan } from '@/actions/memberFlashcards/flashcardPhotoHelper';
import * as storageUtils from '@/utils/security/storageUtils';

describe('memberFlashcards - photo-only deck and directory probing', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('should omit members that do not have a portrait URL', () => {
    const deck = flashcardMembersFromScan([
      {
        memberId: 'with-photo',
        fullName: 'Member Photo',
        firstName: 'Member',
        lastName: 'Photo',
        photoUrl: 'https://example.com/photo.jpg',
        hasPhoto: true,
      },
      {
        memberId: 'no-photo',
        fullName: 'Member None',
        firstName: 'Member',
        lastName: 'None',
        hasPhoto: false,
      },
    ]);

    expect(deck).toHaveLength(1);
    expect(deck[0]?.memberId).toBe('with-photo');
  });

  it('should exclude Church Directory members whose portrait endpoint is missing', async () => {
    vi.spyOn(storageUtils, 'getCacheSettings').mockResolvedValue({
      enabled: true,
      expirationDays: 7,
    });
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

    const result = await runMemberFlashcards();

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(1);
    expect(document.getElementById('lcr-card-name')?.textContent).toBe('Alex Taylor');

    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it('should exclude members whose portrait returns an SVG silhouette from the flashcard deck', async () => {
    vi.spyOn(storageUtils, 'getCacheSettings').mockResolvedValue({
      enabled: true,
      expirationDays: 7,
    });
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
          { uuid: 'real-portrait', displayName: 'Real Photo', givenName: 'Real', surname: 'Photo' },
          { uuid: 'svg-silhouette', displayName: 'No Photo', givenName: 'No', surname: 'Photo' },
        ],
      },
    ];

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes('households')) {
        return { ok: true, json: async () => mockHouseholds } as Response;
      }
      if (url.includes('svg-silhouette')) {
        return {
          ok: true,
          status: 200,
          headers: {
            get: (name: string) => (name.toLowerCase() === 'content-type' ? 'image/svg+xml' : null),
          },
        } as unknown as Response;
      }
      return {
        ok: true,
        status: 200,
        headers: {
          get: (name: string) => (name.toLowerCase() === 'content-type' ? 'image/jpeg' : null),
        },
      } as unknown as Response;
    });

    const result = await runMemberFlashcards();

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(1);
    expect(document.getElementById('lcr-card-name')?.textContent).toBe('Real Photo');

    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });
});
