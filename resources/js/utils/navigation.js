/**
 * Navigation utility functions
 */

/**
 * Navigate to a new URL and dispatch navigation events
 * @param {string} url - The URL to navigate to
 * @param {string} title - Optional title for the history entry
 * @param {Object} state - Optional state object
 */
export function navigateTo(url, title = '', state = {}) {
    window.history.pushState(state, title, url);
    window.dispatchEvent(new Event("popstate"));
    window.dispatchEvent(new Event("navigation"));
}

/**
 * Navigate to a new URL using replaceState (no history entry)
 * @param {string} url - The URL to navigate to
 * @param {string} title - Optional title for the history entry
 * @param {Object} state - Optional state object
 */
export function replaceTo(url, title = '', state = {}) {
    window.history.replaceState(state, title, url);
    window.dispatchEvent(new Event("popstate"));
    window.dispatchEvent(new Event("navigation"));
}

export default {
    navigateTo,
    replaceTo
};
