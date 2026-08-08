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
        get: () => value,
        set: (updater) => {
            value = typeof updater === 'function' ? updater(value) : updater;
            listeners.forEach(fn => fn(value));
        },
        mutate: (fn) => fn(value),
        subscribe: (fn) => listeners.push(fn)
    }
}

// ______________________________________________________________________

/**
 * @typedef {Object} Registry
 * @property {(key: string, factory: Function) => void} register
 *      Associates a key with a factory function.
 * @property {(key: string, ...args: *) => *} create
 *      Invokes the factory registered under `key` with the given args.
 * @property {(key: string) => boolean} has
 *      Checks whether a key has a registered factory.
 */

/**
 * Create a generic key -> factory registry.
 * Used both for document-level block types (state.js) and for section content-item types and their renderers — same
 * registration/creation mechanics regardless of what is being produced.
 *
 * @returns {Registry}
 */
export function createRegistry() {
    const entries = {};
    return {
        register(key, factory) {
            entries[key] = factory;
        },
        create(key, ...args) {
            const factory = entries[key]
            if (!factory) throw new Error(`No factory registered for key: ${key}`);
            return factory(...args);
        },
        has(key) {
            return Object.prototype.hasOwnProperty.call(entries, key);
        }
    };
}

/**
 * Generates a unique identifier for blocks and content items.
 * @returns {string}
 */
export function uid() {
    return crypto.randomUUID();
}

/**
 * Computes the insertion index for a drag-and-drop reorder, based on vertical mouse position relative to each direct
 * child's midpoint.
 * @param {HTMLElement} containerEl - Element whose direct children are draggable items.
 * @param {number} clientY - the current mouse Y position
 * @param {string} [childSelector] - Selector for draggable children.
 * @returns {number} index at which a dropped item should be inserted.
 */
export function getDropIndex(containerEl, clientY, childSelector = ':scope > [draggable="true"]') {
    const children = [...containerEl.querySelectorAll(childSelector)];

    for (let i = 0; i < children.length; i++) {
        const rect = children[i].getBoundingClientRect();
        const midpoint = rect.top + rect.height/2;
        if (clientY < midpoint) return i;
    }
    return children.length
}