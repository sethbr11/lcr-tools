import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runMemberFlashcards } from '@/actions/memberFlashcards';
import * as storageUtils from '@/utils/security/storageUtils';
import * as uiUtils from '@/utils/ui/uiUtils';
import * as lcrApiUtils from '@/utils/church/lcrApiUtils';

describe('memberFlashcards - functional user expectations', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'lcr.churchofjesuschrist.org',
        href: 'https://lcr.churchofjesuschrist.org/mlt/records/member-list',
      },
      writable: true,
      configurable: true,
    });
  });

  it('should instantly mount flashcards from local cache if 5 or more members exist', async () => {
    const mockCached = [1, 2, 3, 4, 5].map((i) => ({
      memberId: String(i),
      fullName: i === 1 ? 'John Doe' : `Member ${i}`,
      photoUrl: `https://example.com/${i}.jpg`,
      hasPhoto: true,
    }));

    vi.spyOn(storageUtils, 'getCacheSettings').mockResolvedValue({
      enabled: true,
      expirationDays: 7,
    });
    vi.spyOn(storageUtils, 'getPhotoCache').mockResolvedValue(
      Object.fromEntries(mockCached.map((m) => [m.memberId, { ...m, timestamp: Date.now() }]))
    );

    const result = await runMemberFlashcards();

    expect(result.success).toBe(true);
    expect(result.data?.source).toBe('cache');
    expect(result.data?.count).toBe(5);

    // Flashcard UI container should be mounted
    const flashcardContainer = document.querySelector('#lcr-tools-flashcard-modal');
    expect(flashcardContainer).not.toBeNull();
    expect(flashcardContainer?.textContent).toContain('Member Flashcards');

    // Controls: Flip card, Next, Prev buttons should be present
    expect(flashcardContainer?.querySelector('#lcr-flip-card')).not.toBeNull();
    expect(flashcardContainer?.querySelector('#lcr-next-card')).not.toBeNull();
    expect(flashcardContainer?.querySelector('#lcr-prev-card')).not.toBeNull();
    expect(flashcardContainer?.querySelector('#lcr-shuffle-deck')).not.toBeNull();
    expect(flashcardContainer?.querySelector('#lcr-progress-bar-fill')).not.toBeNull();
  });

  it('should scan DOM directory rows for photos, save to cache, and mount flashcards', async () => {
    vi.spyOn(storageUtils, 'getCacheSettings').mockResolvedValue({
      enabled: true,
      expirationDays: 7,
    });
    vi.spyOn(storageUtils, 'getPhotoCache').mockResolvedValue({});
    const updateCacheSpy = vi.spyOn(storageUtils, 'updatePhotoCache').mockResolvedValue();

    const container = document.createElement('div');
    container.innerHTML = `
      <table>
        <tbody>
          <tr id="101" role="row">
            <td><button class="member-card__styled-ghost">Smith, Adam</button></td>
            <td><img class="member-photo" src="https://example.com/adam.jpg" /></td>
          </tr>
        </tbody>
      </table>
    `;
    document.body.appendChild(container);

    const result = await runMemberFlashcards();

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(1);

    expect(updateCacheSpy).toHaveBeenCalledTimes(1);

    const flashcardContainer = document.querySelector('#lcr-tools-flashcard-modal');
    expect(flashcardContainer).not.toBeNull();
    expect(flashcardContainer?.textContent).toContain('Adam Smith');
  });

  it('should fetch HD photos via API for LCR members when table has no inline images', async () => {
    vi.spyOn(storageUtils, 'getCacheSettings').mockResolvedValue({
      enabled: true,
      expirationDays: 7,
    });
    vi.spyOn(storageUtils, 'getPhotoCache').mockResolvedValue({});
    vi.spyOn(storageUtils, 'updatePhotoCache').mockResolvedValue();

    const container = document.createElement('div');
    container.innerHTML = `
      <table>
        <tbody>
          <tr id="member-uuid-1" role="row">
            <td><button class="member-card__styled-ghost">Young, Brigham</button></td>
          </tr>
        </tbody>
      </table>
    `;
    document.body.appendChild(container);

    vi.spyOn(lcrApiUtils, 'fetchMemberCard').mockResolvedValue({
      name: 'Young, Brigham',
      photoMetadata: {
        tokenUrl: 'https://ws.churchofjesuschrist.org/api/mlu/scdn/v2/img/photo-token-123',
      },
    });

    const result = await runMemberFlashcards();

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(1);

    const cardImg = document.querySelector<HTMLImageElement>('#lcr-card-img');
    expect(cardImg?.src).toContain('/LARGE');
  });

  it('should handle Church Directory page by fetching households and HD photo endpoints', async () => {
    vi.spyOn(storageUtils, 'getCacheSettings').mockResolvedValue({
      enabled: true,
      expirationDays: 7,
    });
    vi.spyOn(storageUtils, 'getPhotoCache').mockResolvedValue({});
    const updateCacheSpy = vi.spyOn(storageUtils, 'updatePhotoCache').mockResolvedValue();

    // Mock window.location for Directory page
    const originalLocation = window.location;
    const dirLoc = new URL(
      'https://directory.churchofjesuschrist.org/?unit=12345'
    ) as unknown as Location;
    Object.defineProperty(window, 'location', {
      value: dirLoc,
      writable: true,
      configurable: true,
    });

    const mockHouseholds = [
      {
        members: [
          {
            uuid: 'member-dir-1',
            displayName: 'Alex Taylor',
            givenName: 'Alex',
            surname: 'Taylor',
          },
          {
            uuid: 'member-dir-2',
            displayName: 'Chris Miller',
            givenName: 'Chris',
            surname: 'Miller',
          },
          {
            uuid: 'member-dir-private',
            displayName: 'Private Member',
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
      return { ok: true, status: 200 } as Response;
    });

    const result = await runMemberFlashcards();

    expect(result.success).toBe(true);
    expect(result.data?.source).toBe('directory-api');
    expect(result.data?.count).toBe(2);
    expect(updateCacheSpy).toHaveBeenCalled();

    const cardImg = document.querySelector<HTMLImageElement>('#lcr-card-img');
    expect(cardImg?.src).toContain('/api/v4/photos/members/member-dir-1');
    expect(cardImg?.src).not.toContain('thumbnail=true');

    // Restore original location
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it('should support flipping, navigating, and keyboard events in flashcard interface', async () => {
    const mockCached = [
      {
        memberId: '1',
        fullName: 'First Member',
        photoUrl: 'https://example.com/1.jpg',
        hasPhoto: true,
      },
      {
        memberId: '2',
        fullName: 'Second Member',
        photoUrl: 'https://example.com/2.jpg',
        hasPhoto: true,
      },
      {
        memberId: '3',
        fullName: 'Third Member',
        photoUrl: 'https://example.com/3.jpg',
        hasPhoto: true,
      },
      {
        memberId: '4',
        fullName: 'Fourth Member',
        photoUrl: 'https://example.com/4.jpg',
        hasPhoto: true,
      },
      {
        memberId: '5',
        fullName: 'Fifth Member',
        photoUrl: 'https://example.com/5.jpg',
        hasPhoto: true,
      },
    ];

    vi.spyOn(storageUtils, 'getCacheSettings').mockResolvedValue({
      enabled: true,
      expirationDays: 7,
    });
    vi.spyOn(storageUtils, 'getPhotoCache').mockResolvedValue(
      Object.fromEntries(mockCached.map((m) => [m.memberId, { ...m, timestamp: Date.now() }]))
    );

    await runMemberFlashcards();

    const cardInner = document.getElementById('lcr-card-inner');
    const cardName = document.getElementById('lcr-card-name');
    const progressEl = document.getElementById('lcr-card-progress');
    const nextBtn = document.getElementById('lcr-next-card');
    const prevBtn = document.getElementById('lcr-prev-card');
    const flipBtn = document.getElementById('lcr-flip-card');

    expect(progressEl?.textContent).toBe('Card 1 of 5');
    expect(cardName?.textContent).toBe('First Member');
    expect(cardInner?.style.transform).toBe('rotateY(0deg)');

    // Flip card
    flipBtn?.click();
    expect(cardInner?.style.transform).toBe('rotateY(180deg)');

    // Next card
    nextBtn?.click();
    expect(progressEl?.textContent).toBe('Card 2 of 5');
    expect(cardName?.textContent).toBe('Second Member');
    expect(cardInner?.style.transform).toBe('rotateY(0deg)');

    // Prev card
    prevBtn?.click();
    expect(progressEl?.textContent).toBe('Card 1 of 5');

    // Space key to flip
    document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
    expect(cardInner?.style.transform).toBe('rotateY(180deg)');

    // Right arrow to go next
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(progressEl?.textContent).toBe('Card 2 of 5');
  });

  it('should normalize legacy relative photo URLs from cache to absolute directory URLs', async () => {
    const mockCached = {
      'm-1': {
        memberId: 'm-1',
        fullName: 'Relative URL Member',
        photoUrl: '/api/v4/photos/members/m-1',
        hasPhoto: true,
        timestamp: Date.now(),
      },
      'm-2': {
        memberId: 'm-2',
        fullName: 'Relative URL Member 2',
        photoUrl: '/api/v4/photos/members/m-2',
        hasPhoto: true,
        timestamp: Date.now(),
      },
      'm-3': {
        memberId: 'm-3',
        fullName: 'Relative URL Member 3',
        photoUrl: '/api/v4/photos/members/m-3',
        hasPhoto: true,
        timestamp: Date.now(),
      },
      'm-4': {
        memberId: 'm-4',
        fullName: 'Relative URL Member 4',
        photoUrl: '/api/v4/photos/members/m-4',
        hasPhoto: true,
        timestamp: Date.now(),
      },
      'm-5': {
        memberId: 'm-5',
        fullName: 'Relative URL Member 5',
        photoUrl: '/api/v4/photos/members/m-5',
        hasPhoto: true,
        timestamp: Date.now(),
      },
    };

    vi.spyOn(storageUtils, 'getCacheSettings').mockResolvedValue({
      enabled: true,
      expirationDays: 7,
    });
    vi.spyOn(storageUtils, 'getPhotoCache').mockResolvedValue(mockCached);

    const result = await runMemberFlashcards();
    expect(result.success).toBe(true);

    const cardImg = document.querySelector<HTMLImageElement>('#lcr-card-img');
    expect(cardImg?.src).toContain(
      'https://directory.churchofjesuschrist.org/api/v4/photos/members/m-1'
    );
  });

  it('should clear photo cache when clear-cache button is clicked in flashcard modal', async () => {
    const clearSpy = vi.spyOn(storageUtils, 'clearPhotoCache').mockResolvedValue();
    const mockCached = Object.fromEntries(
      [1, 2, 3, 4, 5].map((i) => [
        `id-${i}`,
        {
          memberId: `id-${i}`,
          fullName: `Member ${i}`,
          photoUrl: `https://example.com/${i}.jpg`,
          hasPhoto: true,
          timestamp: Date.now(),
        },
      ])
    );

    vi.spyOn(storageUtils, 'getCacheSettings').mockResolvedValue({
      enabled: true,
      expirationDays: 7,
    });
    vi.spyOn(storageUtils, 'getPhotoCache').mockResolvedValue(mockCached);

    await runMemberFlashcards();

    const clearBtn = document.getElementById('lcr-clear-cache');
    expect(clearBtn).not.toBeNull();

    clearBtn?.click();
    expect(clearSpy).toHaveBeenCalledTimes(1);
  });

  it('should warn user if no member photos are found', async () => {
    const toastSpy = vi.spyOn(uiUtils, 'showToast');

    vi.spyOn(storageUtils, 'getCacheSettings').mockResolvedValue({
      enabled: true,
      expirationDays: 7,
    });
    vi.spyOn(storageUtils, 'getPhotoCache').mockResolvedValue({});

    const result = await runMemberFlashcards();

    expect(result.success).toBe(false);
    expect(result.error).toBe('No photos found');
    expect(toastSpy).toHaveBeenCalledWith(
      expect.stringContaining('No member photos found'),
      expect.objectContaining({ type: 'warning' })
    );
  });

  it('should reject execution with warning toast when not on a directory page', async () => {
    Object.defineProperty(window, 'location', {
      value: {
        hostname: 'www.google.com',
        href: 'https://www.google.com/',
      },
      writable: true,
      configurable: true,
    });

    const toastSpy = vi.spyOn(uiUtils, 'showToast');
    const result = await runMemberFlashcards();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Not on directory page');
    expect(toastSpy).toHaveBeenCalledWith(
      expect.stringContaining('Please visit the Member Directory or Church Directory'),
      expect.objectContaining({ type: 'warning' })
    );
  });
});
