/**
 * Lightweight props utilities that are pure and easy to unit-test.
 */
export function propsEqual(oldProps: any, newProps: any) {
    const oldKeys = Object.keys(oldProps || {});
    const newKeys = Object.keys(newProps || {});
    if (oldKeys.length !== newKeys.length) return false;

    for (const k of oldKeys) {
        if (oldProps[k] != newProps[k]) {
            return false;
        }
    }
    return true;
}

/**
 * Return a shallow canonicalized props object. Useful for comparing or
 * generating cached keys. Currently a no-op shallow copy but centralized
 * so future normalizations live here.
 */
export function canonicalizeProps(props: any) {
    return Object.assign({}, props);
}
