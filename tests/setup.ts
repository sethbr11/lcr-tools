import '@testing-library/jest-dom';

// Provide Chrome / WebExtension mock environment for Node jsdom testing
interface MockChrome {
  runtime: {
    id: string;
    getURL: (path: string) => string;
    onMessage: { addListener: () => void };
    sendMessage: () => Promise<void>;
  };
  tabs: {
    query: () => Promise<Array<{ id: number; url: string }>>;
    create: (opts: Record<string, unknown>) => Promise<{ id: number } & Record<string, unknown>>;
  };
  storage: {
    local: {
      get: () => Promise<Record<string, unknown>>;
      set: () => Promise<void>;
      remove: () => Promise<void>;
    };
    session?: {
      get: (keys?: unknown) => Promise<Record<string, unknown>>;
      set: (items: Record<string, unknown>) => Promise<void>;
      remove: (keys: unknown) => Promise<void>;
    };
  };
  scripting: {
    executeScript: () => Promise<unknown[]>;
  };
}

const mockChrome: MockChrome = {
  runtime: {
    id: 'test-extension-id',
    getURL: (path: string) => `chrome-extension://test-extension-id/${path}`,
    onMessage: { addListener: () => {} },
    sendMessage: () => Promise.resolve(),
  },
  tabs: {
    query: () =>
      Promise.resolve([
        { id: 101, url: 'https://lcr.churchofjesuschrist.org/mlt/records/member-list' },
      ]),
    create: (opts: Record<string, unknown>) => Promise.resolve({ id: 102, ...opts }),
  },
  storage: {
    local: {
      get: () => Promise.resolve({}),
      set: () => Promise.resolve(),
      remove: () => Promise.resolve(),
    },
    session: {
      get: () => Promise.resolve({}),
      set: () => Promise.resolve(),
      remove: () => Promise.resolve(),
    },
  },
  scripting: {
    executeScript: () => Promise.resolve([]),
  },
};

const g = globalThis as unknown as { chrome?: MockChrome; browser?: MockChrome };
if (typeof g.chrome === 'undefined') {
  g.chrome = mockChrome;
}
if (typeof g.browser === 'undefined') {
  g.browser = g.chrome;
}

// jsdom layout simulation for visibility checks
Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
  configurable: true,
  get(this: HTMLElement) {
    return this.style.display === 'none' ? 0 : 100;
  },
});
Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
  configurable: true,
  get(this: HTMLElement) {
    return this.style.display === 'none' ? 0 : 30;
  },
});
Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
  configurable: true,
  get(this: HTMLElement) {
    return this.style.display === 'none' ? null : this.parentElement || document.body;
  },
});

// Mock URL object methods for jsdom
if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = () => 'blob:mock-blob-url';
}
if (typeof URL.revokeObjectURL === 'undefined') {
  URL.revokeObjectURL = () => {};
}
