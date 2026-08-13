/**
 * SAVED PROJECT CREDENTIALS + IDENTIFIERS
 *
 * These are preserved from the original build so the redesign can reuse them.
 * Do not delete — the OAuth/Google and store identifiers must survive a redesign.
 */

export const appCredentials = {
  /** Expo app identity */
  slug: 'mars-mobile',
  scheme: 'mars',
  package: 'world.ashir.mars',
  bundleIdentifier: 'world.ashir.mars',
  easProjectId: 'de93ee69-8f27-4c55-a8d1-ab851751cfbb',
  easOwner: 'contractorx',

  /** Google Cloud OAuth (native client IDs) */
  google: {
    iosClientId: '1005880771549-c9ke8v0cqnm99ifjpi94ioivuvsavrjr.apps.googleusercontent.com',
    androidClientId: '1005880771549-dokpfvp5lmfl496trtqkha05tpqjg4fl.apps.googleusercontent.com',
    webClientId: '',
  },

  /** Desktop API (FastAPI gateway) */
  desktopApi: {
    defaultPort: 40003,
  },
} as const;
