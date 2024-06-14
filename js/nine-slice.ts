import {Mesh, MeshAttribute, MeshIndexType, WonderlandEngine} from '@wonderlandengine/api';

const AxisZ = [0, 0, 1];

export function nineSlice(
    engine: WonderlandEngine,
    width: number,
    height: number,
    borderSize: number,
    oldMesh?: Mesh | null
): Mesh {
    const vertexCount = 16;

    let mesh = null;
    if (oldMesh && oldMesh.vertexCount == vertexCount) {
        mesh = oldMesh;
    }

    /* Vertex indices:
    12-- 4 ----- 5 --13
    |    |       |    |
    11-- 0 ----- 1 -- 6
    |    |       |    |
    |    |       |    |
    10-- 3 ----- 2 -- 7
    |    |       |    |
    15-- 9 ----- 8 --14
    */

    if (!mesh) {
        const indexData = new Uint16Array(54);
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
            0, 10, 3, 10, 0, 11,
            /* Top-left corner */
            0, 4, 11, 11, 4, 12,
            /* Top-right corner */
            1, 6, 5, 5, 6, 13,
            /* Bootom-right corner */
            2, 8, 7, 7, 8, 14,
            /* Bootom-left corner */
            3, 10, 9, 9, 10, 15
        ]);

        mesh = engine.meshes.create({
            indexData,
            vertexCount,
            indexType: MeshIndexType.UnsignedShort,
        });
    }

    const pos = mesh.attribute(MeshAttribute.Position)!;

    const w = width * 0.5;
    const h = height * 0.5;
    const iw = w - borderSize;
    const ih = h - borderSize;
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
        /* 12 */
        -w, h, 0,
        /* 13 */
        w, h, 0,
        /* 14 */
        w, -h, 0,
        /* 15 */
        -w, -h, 0,
    ])

    const texCoords = mesh.attribute(MeshAttribute.TextureCoordinate);
    if (texCoords) {
        // prettier-ignore
        texCoords.set(0, [
            /* 0 */
            0.4, 0.4,
            /* 1 */
            0.6, 0.4,
            /* 2 */
            0.6, 0.6,
            /* 3 */
            0.4, 0.6,
            /* 4 */
            0.4, 0.0,
            /* 5 */
            0.6, 0.0,
            /* 6 */
            1.0, 0.4,
            /* 7 */
            1.0, 0.6,
            /* 8 */
            0.6, 1.0,
            /* 9 */
            0.4, 1.0,
            /* 10 */
            0.0, 0.6,
            /* 11 */
            0.0, 0.4,
            /* 12 */
            0.0, 0.0,
            /* 13 */
            1.0, 0.0,
            /* 14 */
            1.0, 1.0,
            /* 15 */
            0.0, 1.0,
        ]);
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
