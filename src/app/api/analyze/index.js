/**
 * This is the entry point for the browser-side script.
 * It bundles all necessary functions and exposes a single entry point on the window object.
 */
import { identifyProductContainersSerializable } from '../identifyProductContainers';

// Expose the main function to the window object so Puppeteer can call it.
// We are also including its dependencies this way.
window.__GRIT_SELECTOR__ = {
  identifyProductContainers: identifyProductContainersSerializable,
};