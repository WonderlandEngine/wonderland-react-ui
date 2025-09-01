export const Z_INC = 0.001;

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

export function setPositionCenter(o: any, n: any, s: number[]) {
    const w = n.node.getComputedWidth();
    if (isNaN(w)) {
        return;
    }
    o.setPositionLocal([
        (n.node.getComputedLeft() + 0.5 * n.node.getComputedWidth()) * s[0],
        -n.node.getComputedTop() * s[1],
        Z_INC + (n.props.z ?? 0),
    ]);
}

export function setPositionLeft(o: any, n: any, s: number[]) {
    o.setPositionLocal([
        n.node.getComputedLeft() * s[0],
        -n.node.getComputedTop() * s[1],
        Z_INC + (n.props.z ?? 0),
    ]);
}

export function setPositionRight(o: any, n: any, s: number[]) {
    o.setPositionLocal([
        (n.node.getComputedLeft() + n.node.getComputedWidth()) * s[0],
        -n.node.getComputedTop() * s[1],
        Z_INC + (n.props.z ?? 0),
    ]);
}
