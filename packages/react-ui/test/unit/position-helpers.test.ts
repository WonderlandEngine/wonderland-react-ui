import {describe, it, expect, beforeEach} from 'vitest';
import {mock} from 'vitest-mock-extended';
import {Object3D} from '@wonderlandengine/api';

import {Z_INC} from '../../js/constants.js';
import {
    setPositionCenter,
    setPositionLeft,
    setPositionRight,
} from '../../js/helpers/position-helpers';

describe('Position helpers', () => {
    let mockNode: any;
    let wrapper: any;
    let fakeObject: Object3D;

    beforeEach(() => {
        mockNode = {
            getComputedWidth: () => 1,
            getComputedLeft: () => 1,
            getComputedTop: () => 1,
        };
        wrapper = {
            node: mockNode,
            props: {z: 0},
        };
        fakeObject = mock<Object3D>();
    });
    describe('setPositionLeft', () => {
        it('should set the expected left position', () => {
            setPositionLeft(fakeObject, wrapper, [5, 1]);
            expect(fakeObject.setPositionLocal).toHaveBeenCalledWith([
                5,
                expect.any(Number),
                expect.any(Number),
            ]);
        });
        it('should use 0 if z is undefined', () => {
            wrapper.props.z = undefined;
            setPositionLeft(fakeObject, wrapper, [1, 1]);
            expect(fakeObject.setPositionLocal).toHaveBeenCalledWith([
                expect.any(Number),
                expect.any(Number),
                Z_INC,
            ]);
        });
        it('should set z if defined', () => {
            wrapper.props.z = 50;
            setPositionLeft(fakeObject, wrapper, [1, 1]);
            expect(fakeObject.setPositionLocal).toHaveBeenCalledWith([
                expect.any(Number),
                expect.any(Number),
                Z_INC + 50,
            ]);
        });
    });
    describe('setPositionCenter', () => {
        it('should set the expected center position', () => {
            //n.node.getComputedLeft() + 0.5 * n.node.getComputedWidth()) * s[0]
            const l = 50;
            const w = 200;
            mockNode.getComputedLeft = () => l;
            mockNode.getComputedWidth = () => w;
            const calc = l + 0.5 * w;

            setPositionCenter(fakeObject, wrapper, [8, 1]);

            expect(fakeObject.setPositionLocal).toHaveBeenCalledWith([calc * 8, -1, Z_INC]);
        });

        it('should do nothing if width is NaN', () => {
            mockNode.getComputedWidth = () => NaN;
            setPositionCenter(fakeObject, wrapper, [1, 1]);
            expect(fakeObject.setPositionLocal).not.toHaveBeenCalled();
        });

        it('should use 0 if z is undefined', () => {
            wrapper.props.z = undefined;
            setPositionCenter(fakeObject, wrapper, [1, 1]);
            expect(fakeObject.setPositionLocal).toHaveBeenCalledWith([
                expect.any(Number),
                expect.any(Number),
                Z_INC,
            ]);
        });
        it('should set z if defined', () => {
            wrapper.props.z = 50;
            setPositionCenter(fakeObject, wrapper, [1, 1]);
            expect(fakeObject.setPositionLocal).toHaveBeenCalledWith([
                expect.any(Number),
                expect.any(Number),
                Z_INC + 50,
            ]);
        });
    });

    describe('setPositionRight', () => {
        it('should set the expected right position', () => {
            setPositionRight(fakeObject, wrapper, [1, 1]);
            expect(fakeObject.setPositionLocal).toHaveBeenCalledWith([
                2,
                expect.any(Number),
                expect.any(Number),
            ]);
        });
        it('should use 0 if z is undefined', () => {
            wrapper.props.z = undefined;
            setPositionRight(fakeObject, wrapper, [1, 1]);
            expect(fakeObject.setPositionLocal).toHaveBeenCalledWith([
                expect.any(Number),
                expect.any(Number),
                Z_INC,
            ]);
        });
        it('should set z if defined', () => {
            wrapper.props.z = 50;
            setPositionRight(fakeObject, wrapper, [1, 1]);
            expect(fakeObject.setPositionLocal).toHaveBeenCalledWith([
                expect.any(Number),
                expect.any(Number),
                Z_INC + 50,
            ]);
        });
    });
});
