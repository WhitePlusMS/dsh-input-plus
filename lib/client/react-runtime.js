/**
 * Minimal React runtime adapter for the static client bundle.
 *
 * DSH already loads React for its official conversation package. The client
 * bundle's outer ModuleLoader supplies that package resolver to this factory,
 * so the plugin can render additive slot entries without bundling React again.
 */
function loadReact() {
    try {
        if (typeof require === 'function')
            return require('react');
    }
    catch {
        // Unit tests and non-React host probes can load the pure modules safely.
    }
    return undefined;
}
const react = loadReact();
export function element(type, props, ...children) {
    return react?.createElement(type, props, ...children) ?? null;
}
