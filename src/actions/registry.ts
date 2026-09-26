import { Constants, Regex, Types } from '@/types';
import { isUrlMatching } from '@/utils';

/* ==========================================================================
   EXPORTED FUNCTIONS
   ========================================================================== */

/**
 * Single source of truth containing metadata, categories, and URL patterns for all actions.
 */
export const ACTION_REGISTRY: Types.ActionDefinition[] = [
  {
    id: 'downloadReportData',
    title: 'Download Report Data (CSV)',
    category: 'Data Export',
    description:
      'Export table data from LCR reports to CSV format for analysis in Excel or other tools.',
    type: 'script',
    urlPatterns: {
      include: ['lcr.churchofjesuschrist.org/'],
      exclude: [
        'records/member-profile',
        'manage-photos',
        'report/self-reliance',
        'records/merge-duplicate',
        'mlt/approve-photos',
        'report/unit-statistics',
        Regex.CONFIDENTIAL_REPORT_PATH,
        Regex.BASE_PAGE_URL,
      ],
      excludeExactMinistering: true,
    },
    directoryPages: [{ name: 'Most LCR pages with tables', url: null }],
    directoryExcluded: [
      'Member Profile Pages',
      'Manage Photos Page',
      'Self-Reliance Report',
      'Merge Duplicate Members',
      'Confidential Report Pages',
      'Unit Statistics',
    ],
  },
  {
    id: 'tableFilters',
    title: 'Filter Table Data',
    category: 'Data Management',
    description: 'Apply custom filters to tables on LCR pages to find specific data quickly.',
    type: 'script',
    urlPatterns: {
      include: ['lcr.churchofjesuschrist.org/'],
      exclude: [
        'records/member-profile',
        'manage-photos',
        'report/self-reliance',
        'records/merge-duplicate',
        'mlt/approve-photos',
        'report/unit-statistics',
        Regex.CONFIDENTIAL_REPORT_PATH,
        Regex.BASE_PAGE_URL,
      ],
    },
    directoryPages: [{ name: 'Most LCR pages with tables', url: null }],
    directoryExcluded: [
      'Member Profile Pages',
      'Manage Photos Page',
      'Self-Reliance Report',
      'Merge Duplicate Members',
      'Confidential Report Pages',
      'Unit Statistics',
    ],
  },
  {
    id: 'noPhotoList',
    title: 'Download List of Members with No Photo',
    category: 'Member Management',
    description:
      'Generate a list of all members who are missing profile photos for easy follow-up.',
    type: 'script',
    urlPatterns: {
      include: ['mlt/records/member-list', 'directory.churchofjesuschrist.org'],
      exclude: [],
    },
    directoryPages: [
      {
        name: 'Member Directory',
        url: 'https://lcr.churchofjesuschrist.org/mlt/records/member-list',
      },
      {
        name: 'Church Directory & Map',
        url: Constants.CHURCH_DIRECTORY_URL,
      },
    ],
  },
  {
    id: 'memberFlashcards',
    title: 'Member Flashcards',
    category: 'Member Management',
    description:
      'Study and memorize member faces and names with an interactive flashcard interface.',
    type: 'script',
    urlPatterns: {
      include: ['mlt/records/member-list', 'directory.churchofjesuschrist.org'],
      exclude: [],
    },
    directoryPages: [
      {
        name: 'Member Directory',
        url: 'https://lcr.churchofjesuschrist.org/mlt/records/member-list',
      },
      {
        name: 'Church Directory & Map',
        url: Constants.CHURCH_DIRECTORY_URL,
      },
    ],
  },
  {
    id: 'findMultipleCallings',
    title: 'Find Members with Multiple Callings',
    category: 'Calling Management',
    description:
      'Identify members who have been assigned to multiple callings across the organization.',
    type: 'script',
    urlPatterns: {
      include: ['mlt/orgs', 'mlt/report/member-callings'],
      exclude: [],
    },
    directoryPages: [
      {
        name: 'Callings by Organization',
        url: 'https://lcr.churchofjesuschrist.org/mlt/orgs',
      },
      {
        name: 'Members with Callings',
        url: 'https://lcr.churchofjesuschrist.org/mlt/report/member-callings',
      },
    ],
  },
  {
    id: 'processAttendance',
    title: 'Process Attendance',
    category: 'Tools',
    description:
      'Import attendance records from spreadsheet paste or CSV files directly into LCR attendance forms.',
    type: 'script',
    urlPatterns: {
      include: ['mlt/report/class-and-quorum-attendance', 'class-and-quorum-attendance'],
      exclude: [],
    },
    directoryPages: [
      {
        name: 'Class & Quorum Attendance',
        url: 'https://lcr.churchofjesuschrist.org/mlt/report/class-and-quorum-attendance',
      },
    ],
  },
  {
    id: 'membersOutsideBoundary',
    title: 'Ward Boundary Audit',
    category: 'Member Management',
    description:
      'Identify ward member households residing outside the official geographical boundary overlay.',
    type: 'script',
    urlPatterns: {
      include: ['directory.churchofjesuschrist.org'],
      exclude: [],
    },
    directoryPages: [
      {
        name: 'Church Directory & Map',
        url: Constants.CHURCH_DIRECTORY_URL,
      },
    ],
  },
  {
    id: 'tripPlanning',
    title: 'Trip Planner',
    category: 'Tools',
    description:
      'Plot ministering visits and member locations on an interactive map with smart clustering and optimized routes.',
    type: 'script',
    urlPatterns: {
      include: ['mlt/report/members-moved-in'],
      exclude: [],
    },
    directoryPages: [
      {
        name: 'Members Moved In Report',
        url: 'https://lcr.churchofjesuschrist.org/mlt/report/members-moved-in',
      },
    ],
  },
  {
    id: 'autoSyncStateDropdown',
    title: 'Auto-Sync State Dropdown',
    category: 'Tools',
    description:
      'Automatically synchronizes pre-selected state dropdown values so addresses save reliably.',
    type: 'script',
    executionMode: 'passive',
    defaultEnabled: false,
    storageKey: Constants.PASSIVE_STATE_DROPDOWN_KEY,
    urlPatterns: {
      include: ['lcr.churchofjesuschrist.org/'],
      exclude: [],
    },
    directoryPages: [
      {
        name: 'Move In / Move Out Records',
        url: 'https://lcr.churchofjesuschrist.org/records/move-in',
      },
      {
        name: 'Any LCR page with address fields',
        url: null,
      },
    ],
  },
];

/**
 * Filters the action catalog to retrieve only actions compatible with a given tab URL and execution mode.
 *
 * @param url - Active tab URL string.
 * @param mode - Execution mode to filter by ('active' or 'passive', default 'active').
 * @returns Array of ActionDefinition records applicable to the current page.
 */
export function getActionsForUrl(
  url: string | null | undefined,
  mode: 'active' | 'passive' = 'active'
): Types.ActionDefinition[] {
  if (!url) {
    return [];
  }

  return ACTION_REGISTRY.filter((action) => {
    const actionMode = action.executionMode || 'active';
    if (actionMode !== mode) {
      return false;
    }

    // Special exclusion for exact ministering base path
    if (action.urlPatterns.excludeExactMinistering && Regex.MINISTERING_PATH.test(url)) {
      return false;
    }

    return isUrlMatching(url, action.urlPatterns);
  });
}

/**
 * Filters the action catalog to retrieve only passive actions compatible with a given tab URL.
 *
 * @param url - Active tab URL string.
 * @returns Array of passive ActionDefinition records applicable to the current page.
 */
export function getPassiveActionsForUrl(url: string | null | undefined): Types.ActionDefinition[] {
  return getActionsForUrl(url, 'passive');
}
