/**
 * @typedef {Object} Observable
 * @property {() => *} get
 *      Returns the current value. Read-only, never trigger notifications.
 * @property {(updater: (*|((value: *) => *))) => void} set
 *      Replace the value (or transforms it by a function) and notifies all subscribers. Use this when the change is
 *      NOT already reflected in the DOM and a re-render is needed.
 * @property {(fn: (value: *) => * ) => void} mutate
 *      Mutates the value in place by a side effect function, WITHOUT notifying subscribers. Use this when the DOM is
 *      already up to date on its own.
 * @property {(fn: (value: *) => * ) => void} subscribe
 *      Registers a function to be called whenever 'set' is invoked.
 */

/**
 * Create a minimal observable store.
 * Wraps a mutable value in a closure and notifies registered listeners only when the value changes by 'set'.
 *
 * @template T
 * @param {T} initialValue - The initial value of the store.
 * @returns {Observable} Store with get/set/mutate/subscribe API.
 */
export function createObservable(initialValue) {
    let value = initialValue;
    let listeners = [];
    return {
        get : () => value,
        set: (updater) => {
            value = typeof updater === 'function' ? updater(value) : updater;
            listeners.forEach(fn => fn(value));
        },
        mutate: (fn) => fn(value),
        subscribe: (fn) => listeners.push(fn)
    }
}