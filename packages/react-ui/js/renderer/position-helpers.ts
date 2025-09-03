export const Z_INC = 0.001;

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
