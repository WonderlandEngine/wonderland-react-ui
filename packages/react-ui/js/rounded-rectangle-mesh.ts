import {
    Component,
    Mesh,
    MeshAttribute,
    MeshComponent,
    MeshIndexType,
    WonderlandEngine,
} from '@wonderlandengine/api';
import {property} from '@wonderlandengine/api/decorators.js';

const AxisZ = [0, 0, 1];

export function roundedRectangle(
    engine: WonderlandEngine,
    width: number,
    height: number,
    roundness: number,
    resolution: number,
    corners: {tl: boolean; tr: boolean; br: boolean; bl: boolean} = {
        tl: true,
        tr: true,
        br: true,
        bl: true,
    },
    oldMesh?: Mesh | null
): Mesh {
    const vertexCount = 4 + 8 + 4 * (resolution - 1);

    let mesh = null;
    if (oldMesh && oldMesh.vertexCount == vertexCount) {
        mesh = oldMesh;
    }

    if (!mesh) {
        const indexData = new Uint16Array(3 * 4 * resolution + 5 * 6);
        /* Planes */
        // prettier-ignore
        indexData.set([
            /* Center plane */
            0, 2, 1, 2, 0, 3,
            /* Top plane */
            0, 1, 4, 1, 5, 4,
            /* Right plane */
            2, 6, 1, 6, 2, 7,
            /* Bottom plane */
            3, 8, 2, 8, 3, 9,
            /* Left plane */
            0, 10, 3, 10, 0, 11
        ]);

        let offset = 30;
        for (let c = 0; c < 4; ++c) {
            const start = 4 + ((2 * c + 7) % 8);
            const end = 4 + 2 * c;

            let last = start;
            for (let r = 1; r < resolution; ++r, offset += 3) {
                const next = 11 + c * (resolution - 1) + r;
                indexData.set([last, c, next], offset);
                last = next;
            }
            indexData.set([last, c, end], offset);
            offset += 3;
        }
        mesh = engine.meshes.create({
            indexData,
            vertexCount,
            indexType: MeshIndexType.UnsignedShort,
        });
    }

    const pos = mesh.attribute(MeshAttribute.Position)!;

    const w = width * 0.5;
    const h = height * 0.5;
    const iw = w - roundness;
    const ih = h - roundness;
    // prettier-ignore
    pos?.set(0, [
        /* 0 */
        -iw, ih, 0,
        /* 1 */
        iw, ih, 0,
        /* 2 */
        iw, -ih, 0,
        /* 3 */
        -iw, -ih, 0,
        /* 4 */
        -iw, h, 0,
        /* 5 */
        iw, h, 0,
        /* 6 */
        w, ih, 0,
        /* 7 */
        w, -ih, 0,
        /* 8 */
        iw, -h, 0,
        /* 9 */
        -iw, -h, 0,
        /* 10 */
        -w, -ih, 0,
        /* 11 */
        -w, ih, 0,
    ])

    const angleIncrement = Math.PI / 2 / resolution;
    const offset0 = 11;
    const offset1 = 11 + 1 * (resolution - 1);
    const offset2 = 11 + 2 * (resolution - 1);
    const offset3 = 11 + 3 * (resolution - 1);
    for (let i = 1; i < resolution; ++i) {
        const angle = angleIncrement * i;
        const x = Math.sin(angle) * roundness;
        const y = Math.cos(angle) * roundness;

        const r = roundness;
        if (corners.tl) {
            pos.set(offset0 + i, [-iw - y, ih + x, 0]);
        } else {
            pos.set(offset0 + i, [-iw - r, ih + r, 0]);
        }
        if (corners.tr) {
            pos.set(offset1 + i, [iw + x, ih + y, 0]);
        } else {
            pos.set(offset1 + i, [iw + r, ih + r, 0]);
        }
        if (corners.br) {
            pos.set(offset2 + i, [iw + y, -ih - x, 0]);
        } else {
            pos.set(offset2 + i, [iw + r, -ih - r, 0]);
        }
        if (corners.bl) {
            pos.set(offset3 + i, [-iw - x, -ih - y, 0]);
        } else {
            pos.set(offset3 + i, [-iw - r, -ih - r, 0]);
        }
    }

    const texCoords = mesh.attribute(MeshAttribute.TextureCoordinate);
    const tempPos = new Float32Array(3);
    const tempUV = new Float32Array(2);
    if (texCoords) {
        for (let i = 0; i < vertexCount; ++i) {
            pos.get(i, tempPos);
            tempUV[0] = (tempPos[0] + w) / width;
            tempUV[1] = (tempPos[1] + h) / height;
            texCoords.set(i, tempUV);
        }
    }

    const norm = mesh.attribute(MeshAttribute.Normal);
    if (norm) {
        for (let i = 0; i < vertexCount; ++i) {
            norm.set(i, AxisZ);
        }
    }

    mesh.update();
    return mesh;
}

export function roundedRectangleOutline(
    engine: WonderlandEngine,
    width: number,
    height: number,
    roundness: number,
    resolution: number,
    borderSize: number,
    corners: {tl: boolean; tr: boolean; br: boolean; bl: boolean} = {
        tl: true,
        tr: true,
        br: true,
        bl: true,
    },
    oldMesh?: Mesh | null
): Mesh {
    const vertexCount = 2 * 4 * (resolution + 1);

    let mesh = oldMesh;
    if (oldMesh && oldMesh.vertexCount != vertexCount) {
        throw new Error(
            'InvalidArgument: incorrect vertex count, needs ' + vertexCount.toString()
        );
    }

    if (!mesh) {
        const indexData = new Uint16Array(vertexCount * 3);
        const quads = vertexCount / 2;
        for (let q = 0; q < quads - 1; ++q) {
            const o = q * 6;
            indexData.set([q, q + 1, quads + q], o);
            indexData.set([quads + q, q + 1, quads + q + 1], o + 3);
        }

        /* Final loop closing quad */
        const o = quads * 6 - 6;
        indexData.set([quads - 1, 0, quads + quads - 1], o);
        indexData.set([quads + quads - 1, 0, quads], o + 3);

        mesh = engine.meshes.create({
            indexData,
            vertexCount,
            indexType: MeshIndexType.UnsignedShort,
        });
    }
    const pos = mesh.attribute(MeshAttribute.Position)!;

    const w = width * 0.5;
    const h = height * 0.5;
    const angleIncrement = Math.PI / 2 / resolution;
    for (let b = 0; b < 2; ++b) {
        const offset0 = b == 0 ? 0 : vertexCount / 2;
        const offset1 = offset0 + 1 * (resolution + 1);
        const offset2 = offset0 + 2 * (resolution + 1);
        const offset3 = offset0 + 3 * (resolution + 1);

        const bs = b * borderSize;
        const iw = w - roundness;
        const ih = h - roundness;

        for (let i = 0; i <= resolution; ++i) {
            const angle = angleIncrement * i;
            const x = Math.sin(angle) * (roundness + bs);
            const y = Math.cos(angle) * (roundness + bs);

            const r = roundness;
            if (corners.tl) {
                pos.set(offset0 + i, [-iw - y, ih + x, 0]);
            } else {
                pos.set(offset0 + i, [-iw - r, ih + r, 0]);
            }
            if (corners.tr) {
                pos.set(offset1 + i, [iw + x, ih + y, 0]);
            } else {
                pos.set(offset1 + i, [iw + r, ih + r, 0]);
            }
            if (corners.br) {
                pos.set(offset2 + i, [iw + y, -ih - x, 0]);
            } else {
                pos.set(offset2 + i, [iw + r, -ih - r, 0]);
            }
            if (corners.bl) {
                pos.set(offset3 + i, [-iw - x, -ih - y, 0]);
            } else {
                pos.set(offset3 + i, [-iw - r, -ih - r, 0]);
            }
        }
    }

    const texCoords = mesh.attribute(MeshAttribute.TextureCoordinate);
    const tempPos = new Float32Array(3);
    const tempUV = new Float32Array(2);
    if (texCoords) {
        for (let i = 0; i < vertexCount; ++i) {
            pos.get(i, tempPos);
            tempUV[0] = (tempPos[0] + w) / width;
            tempUV[1] = (tempPos[1] + h) / height;
            texCoords.set(i, tempUV);
        }
    }

    const norm = mesh.attribute(MeshAttribute.Normal);
    if (norm) {
        for (let i = 0; i < vertexCount; ++i) {
            norm.set(i, AxisZ);
        }
    }

    mesh.update();

    return mesh;
}

/**
 * rounded-rectangle-mesh
 */
export class RoundedRectangleMesh extends Component {
    static TypeName = 'rounded-rectangle-mesh';

    /* Properties that are configurable in the editor */

    @property.int(8)
    resolution = 8;

    @property.float(1.0)
    width = 1.0;

    @property.float(1.0)
    height = 1.0;

    @property.float(0.2)
    roundness = 0.2;

    start() {
        this.object.getComponent(MeshComponent)!.mesh = roundedRectangle(
            this.engine,
            this.width,
            this.height,
            this.roundness,
            this.resolution
        );
    }

    update(dt: number) {
        /* Called every frame. */
    }
}
