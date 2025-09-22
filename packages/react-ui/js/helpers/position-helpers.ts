import {Object3D} from '@wonderlandengine/api';
import {Z_INC} from '../constants.js';
import {NodeWrapper} from '../renderer.js';

/**
 * Position an Object3D at the horizontal center of the node's computed layout.
 */
export function setPositionCenter(
    obj: Object3D,
    nodeWrapper: NodeWrapper,
    scale: number[]
) {
    const w = nodeWrapper.node.getComputedWidth();
    if (isNaN(w)) {
        return;
    }
    obj.setPositionLocal([
        (nodeWrapper.node.getComputedLeft() + 0.5 * nodeWrapper.node.getComputedWidth()) *
            scale[0],
        -nodeWrapper.node.getComputedTop() * scale[1],
        Z_INC + (nodeWrapper.props.z ?? 0),
    ]);
}

/**
 * Position an Object3D at the left edge of the node's computed layout.
 */
export function setPositionLeft(obj: Object3D, nodeWrapper: NodeWrapper, scale: number[]) {
    obj.setPositionLocal([
        nodeWrapper.node.getComputedLeft() * scale[0],
        -nodeWrapper.node.getComputedTop() * scale[1],
        Z_INC + (nodeWrapper.props.z ?? 0),
    ]);
}

/**
 * Position an Object3D at the right edge of the node's computed layout.
 */
export function setPositionRight(obj: Object3D, nodeWrapper: NodeWrapper, scale: number[]) {
    obj.setPositionLocal([
        (nodeWrapper.node.getComputedLeft() + nodeWrapper.node.getComputedWidth()) *
            scale[0],
        -nodeWrapper.node.getComputedTop() * scale[1],
        Z_INC + (nodeWrapper.props.z ?? 0),
    ]);
}
