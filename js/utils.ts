export function hexToFloat32Array(hex: string, out?: Float32Array): Float32Array {
    // Check if the first character is '#' and remove it if present
    if (hex[0] === '#') {
        hex = hex.slice(1);
    }

    let r: number,
        g: number,
        b: number,
        a: number = 1.0;

    if (hex.length === 3) {
        // #fff format
        r = parseInt(hex[0] + hex[0], 16) / 255;
        g = parseInt(hex[1] + hex[1], 16) / 255;
        b = parseInt(hex[2] + hex[2], 16) / 255;
    } else if (hex.length === 6) {
        // #ffffff format
        r = parseInt(hex.slice(0, 2), 16) / 255;
        g = parseInt(hex.slice(2, 4), 16) / 255;
        b = parseInt(hex.slice(4, 6), 16) / 255;
    } else if (hex.length === 8) {
        // #ff00ff00 format
        r = parseInt(hex.slice(0, 2), 16) / 255;
        g = parseInt(hex.slice(2, 4), 16) / 255;
        b = parseInt(hex.slice(4, 6), 16) / 255;
        a = parseInt(hex.slice(6, 8), 16) / 255;
    } else {
        throw new Error('Invalid hex color format');
    }

    out = out ?? new Float32Array([r, g, b, a]);
    out[0] = r;
    out[1] = g;
    out[2] = b;
    out[3] = a;
    return out;
}

export function parseColor(
    hex: number | string | Float32Array,
    out?: Float32Array
): Float32Array {
    if (typeof hex == 'string') return hexToFloat32Array(hex, out);
    if (typeof hex == 'number') {
        out = out ?? new Float32Array(4);
        out[0] = ((hex >> 24) & 0xff) / 255;
        out[1] = ((hex >> 16) & 0xff) / 255;
        out[2] = ((hex >> 8) & 0xff) / 255;
        out[3] = (hex & 0xff) / 255;
        return out;
    }
    return hex;
}
