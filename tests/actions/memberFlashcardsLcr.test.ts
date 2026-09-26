import { describe, it, expect, beforeEach, vi } from 'vitest';
import { runMemberFlashcards } from '@/actions/memberFlashcards';
import * as storageUtils from '@/utils/security/storageUtils';
import * as lcrApiUtils from '@/utils/church/lcrApiUtils';

describe('memberFlashcards - LCR table row processing and cache reuse', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('should scan all member rows beyond 40 without artificial truncation', async () => {
    vi.spyOn(storageUtils, 'getCacheSettings').mockResolvedValue({
      enabled: true,
      expirationDays: 7,
    });
    vi.spyOn(storageUtils, 'getPhotoCache').mockResolvedValue({});
    const updateCacheSpy = vi.spyOn(storageUtils, 'updatePhotoCache').mockResolvedValue();

    // Generate 55 rows in the LCR table
    const rowsHtml = Array.from(
      { length: 55 },
      (_, i) => `
      <tr id="member-${i + 1}" role="row">
        <td><button class="member-card__styled-ghost">Member, Number ${i + 1}</button></td>
      </tr>
    `
    ).join('');

    const container = document.createElement('div');
    container.innerHTML = `<table><tbody>${rowsHtml}</tbody></table>`;
    document.body.appendChild(container);

    const fetchCardSpy = vi
      .spyOn(lcrApiUtils, 'fetchMemberCard')
      .mockImplementation(async (id) => ({
        name: `Member ${id}`,
        photoMetadata: {
          tokenUrl: `https://ws.churchofjesuschrist.org/api/mlu/scdn/v2/img/token-${id}`,
        },
      }));

    const result = await runMemberFlashcards();

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(55);
    expect(fetchCardSpy).toHaveBeenCalledTimes(55);
    expect(updateCacheSpy).toHaveBeenCalledTimes(1);
  });

  it('should reuse cached photos per row and only fetch missing members', async () => {
    // Member 1 and 2 are cached; Member 3 is uncached
    const mockCache = {
      'member-1': {
        memberId: 'member-1',
        fullName: 'Member 1',
        photoUrl: 'https://example.com/photo-1.jpg',
        hasPhoto: true,
        timestamp: Date.now(),
      },
      'member-2': {
        memberId: 'member-2',
        fullName: 'Member 2',
        photoUrl: 'https://example.com/photo-2.jpg',
        hasPhoto: true,
        timestamp: Date.now(),
      },
    };

    vi.spyOn(storageUtils, 'getCacheSettings').mockResolvedValue({
      enabled: true,
      expirationDays: 7,
    });
    vi.spyOn(storageUtils, 'getPhotoCache').mockResolvedValue(mockCache);
    vi.spyOn(storageUtils, 'updatePhotoCache').mockResolvedValue();

    const container = document.createElement('div');
    container.innerHTML = `
      <table>
        <tbody>
          <tr id="member-1" role="row">
            <td><button class="member-card__styled-ghost">One, Member</button></td>
          </tr>
          <tr id="member-2" role="row">
            <td><button class="member-card__styled-ghost">Two, Member</button></td>
          </tr>
          <tr id="member-3" role="row">
            <td><button class="member-card__styled-ghost">Three, Member</button></td>
          </tr>
        </tbody>
      </table>
    `;
    document.body.appendChild(container);

    const fetchCardSpy = vi.spyOn(lcrApiUtils, 'fetchMemberCard').mockResolvedValue({
      name: 'Three, Member',
      photoMetadata: {
        tokenUrl: 'https://ws.churchofjesuschrist.org/api/mlu/scdn/v2/img/token-3',
      },
    });

    const result = await runMemberFlashcards();

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(3);
    // Only member-3 needed API fetch; member-1 and member-2 were reused from cache
    expect(fetchCardSpy).toHaveBeenCalledTimes(1);
    expect(fetchCardSpy).toHaveBeenCalledWith('member-3');
  });

  it('should skip members confirmed to have hasPhoto: false in cache without re-fetching', async () => {
    const mockCache = {
      'member-photo': {
        memberId: 'member-photo',
        fullName: 'Photo Member',
        photoUrl: 'https://example.com/photo.jpg',
        hasPhoto: true,
        timestamp: Date.now(),
      },
      'member-no-photo': {
        memberId: 'member-no-photo',
        fullName: 'No Photo Member',
        hasPhoto: false,
        timestamp: Date.now(),
      },
    };

    vi.spyOn(storageUtils, 'getCacheSettings').mockResolvedValue({
      enabled: true,
      expirationDays: 7,
    });
    vi.spyOn(storageUtils, 'getPhotoCache').mockResolvedValue(mockCache);
    vi.spyOn(storageUtils, 'updatePhotoCache').mockResolvedValue();

    const container = document.createElement('div');
    container.innerHTML = `
      <table>
        <tbody>
          <tr id="member-photo" role="row">
            <td><button class="member-card__styled-ghost">Photo, Member</button></td>
          </tr>
          <tr id="member-no-photo" role="row">
            <td><button class="member-card__styled-ghost">No Photo, Member</button></td>
          </tr>
        </tbody>
      </table>
    `;
    document.body.appendChild(container);

    const fetchCardSpy = vi.spyOn(lcrApiUtils, 'fetchMemberCard');

    const result = await runMemberFlashcards();

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(1);
    // Zero API calls: member-photo loaded from cache, member-no-photo recognized as having no photo
    expect(fetchCardSpy).not.toHaveBeenCalled();
  });

  it('should skip generic placeholder images and omit members whose API card has no portrait', async () => {
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
          <tr id="member-photo" role="row">
            <td><button class="member-card__styled-ghost">Photo, Member</button></td>
            <td><img class="member-photo" src="https://example.com/real-photo.jpg" /></td>
          </tr>
          <tr id="member-placeholder" role="row">
            <td><button class="member-card__styled-ghost">Silhouette, Member</button></td>
            <td><img class="member-photo" src="https://example.com/nophoto-placeholder.svg" /></td>
          </tr>
        </tbody>
      </table>
    `;
    document.body.appendChild(container);

    const fetchCardSpy = vi.spyOn(lcrApiUtils, 'fetchMemberCard').mockResolvedValue({
      name: 'Silhouette, Member',
      photoMetadata: { tokenUrl: undefined },
    });

    const result = await runMemberFlashcards();

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(1);
    expect(fetchCardSpy).toHaveBeenCalledTimes(1);
    expect(fetchCardSpy).toHaveBeenCalledWith('member-placeholder');
    expect(document.getElementById('lcr-card-name')?.textContent).toBe('Member Photo');
    expect(document.getElementById('lcr-card-placeholder')?.style.display).not.toBe('flex');
  });

  it('should leave the Individuals tab alone when it is already selected', async () => {
    vi.spyOn(storageUtils, 'getCacheSettings').mockResolvedValue({
      enabled: true,
      expirationDays: 7,
    });
    vi.spyOn(storageUtils, 'getPhotoCache').mockResolvedValue({});
    vi.spyOn(storageUtils, 'updatePhotoCache').mockResolvedValue();
    vi.spyOn(lcrApiUtils, 'fetchMemberCard').mockResolvedValue({
      name: 'Photo, Member',
      photoMetadata: { tokenUrl: 'https://example.com/token' },
    });

    document.body.innerHTML = `
      <div role="tablist" class="eden-tabs__tab-list">
        <button id="tab-individuals" role="tab" aria-selected="true" aria-controls="individuals" type="button">
          <div>Individuals</div>
        </button>
        <button id="tab-households" role="tab" aria-selected="false" aria-controls="households" type="button">
          <div>Households</div>
        </button>
      </div>
      <table>
        <tbody>
          <tr id="member-photo" role="row">
            <td><button class="member-card__styled-ghost">Photo, Member</button></td>
            <td><img class="member-photo" src="https://example.com/real-photo.jpg" /></td>
          </tr>
        </tbody>
      </table>
    `;

    const individualsTab = document.getElementById('tab-individuals') as HTMLButtonElement;
    const clickSpy = vi.fn();
    individualsTab.addEventListener('click', clickSpy);

    const result = await runMemberFlashcards();

    expect(result.success).toBe(true);
    expect(clickSpy).not.toHaveBeenCalled();
    expect(individualsTab.getAttribute('aria-selected')).toBe('true');
  });

  it('should switch from Households to Individuals before scanning member photos', async () => {
    vi.spyOn(storageUtils, 'getCacheSettings').mockResolvedValue({
      enabled: true,
      expirationDays: 7,
    });
    vi.spyOn(storageUtils, 'getPhotoCache').mockResolvedValue({});
    vi.spyOn(storageUtils, 'updatePhotoCache').mockResolvedValue();

    document.body.innerHTML = `
      <div role="tablist" class="eden-tabs__tab-list">
        <button id="tab-individuals" role="tab" aria-selected="false" aria-controls="individuals" type="button">
          <div>Individuals</div>
        </button>
        <button id="tab-households" role="tab" aria-selected="true" aria-controls="households" type="button">
          <div>Households</div>
        </button>
      </div>
      <table>
        <tbody>
          <tr id="household-1" role="row">
            <td>Smith Household</td>
          </tr>
        </tbody>
      </table>
    `;

    const individualsTab = document.getElementById('tab-individuals') as HTMLButtonElement;
    const householdsTab = document.getElementById('tab-households') as HTMLButtonElement;
    individualsTab.addEventListener('click', () => {
      individualsTab.setAttribute('aria-selected', 'true');
      householdsTab.setAttribute('aria-selected', 'false');
      const table = document.querySelector('table');
      if (table) {
        table.innerHTML = `
          <tbody>
            <tr id="member-photo" role="row">
              <td><button class="member-card__styled-ghost">Photo, Member</button></td>
              <td><img class="member-photo" src="https://example.com/real-photo.jpg" /></td>
            </tr>
          </tbody>
        `;
      }
    });

    const result = await runMemberFlashcards();

    expect(result.success).toBe(true);
    expect(result.data?.count).toBe(1);
    expect(individualsTab.getAttribute('aria-selected')).toBe('true');
    expect(householdsTab.getAttribute('aria-selected')).toBe('false');
    expect(document.getElementById('lcr-card-name')?.textContent).toBe('Member Photo');
  });

  it('should switch back to Individuals when cache is cleared from the flashcard modal', async () => {
    vi.spyOn(storageUtils, 'getCacheSettings').mockResolvedValue({
      enabled: true,
      expirationDays: 7,
    });
    vi.spyOn(storageUtils, 'getPhotoCache').mockResolvedValue({
      'member-photo': {
        memberId: 'member-photo',
        fullName: 'Member Photo',
        photoUrl: 'https://example.com/real-photo.jpg',
        hasPhoto: true,
        timestamp: Date.now(),
      },
    });
    vi.spyOn(storageUtils, 'updatePhotoCache').mockResolvedValue();
    vi.spyOn(storageUtils, 'clearPhotoCache').mockResolvedValue();

    document.body.innerHTML = `
      <div role="tablist" class="eden-tabs__tab-list">
        <button id="tab-individuals" role="tab" aria-selected="true" aria-controls="individuals" type="button">
          <div>Individuals</div>
        </button>
        <button id="tab-households" role="tab" aria-selected="false" aria-controls="households" type="button">
          <div>Households</div>
        </button>
      </div>
      <table>
        <tbody>
          <tr id="member-photo" role="row">
            <td><button class="member-card__styled-ghost">Photo, Member</button></td>
            <td><img class="member-photo" src="https://example.com/real-photo.jpg" /></td>
          </tr>
        </tbody>
      </table>
    `;

    const individualsTab = document.getElementById('tab-individuals') as HTMLButtonElement;
    const householdsTab = document.getElementById('tab-households') as HTMLButtonElement;
    individualsTab.addEventListener('click', () => {
      individualsTab.setAttribute('aria-selected', 'true');
      householdsTab.setAttribute('aria-selected', 'false');
    });

    await runMemberFlashcards();

    individualsTab.setAttribute('aria-selected', 'false');
    householdsTab.setAttribute('aria-selected', 'true');

    document.getElementById('lcr-clear-cache')?.click();
    await vi.waitFor(() => {
      expect(individualsTab.getAttribute('aria-selected')).toBe('true');
    });
    expect(householdsTab.getAttribute('aria-selected')).toBe('false');
  });
});
