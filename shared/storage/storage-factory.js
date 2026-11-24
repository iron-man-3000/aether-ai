/**
 * Automatic Storage Factory
 * Detects runtime environment (Browser Extension vs. Standard Web)
 */
import { IndexedDBAdapter } from './indexeddb-adapter.js';
import { ExtensionStorageAdapter } from './extension-adapter.js';

export function createStorageAdapter() {
  const isExtension = (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) ||
                      (typeof browser !== 'undefined' && browser.storage && browser.storage.local);

  if (isExtension) {
    return new ExtensionStorageAdapter();
  }
  return new IndexedDBAdapter();
}
