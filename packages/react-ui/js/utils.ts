/**
 * Converts a hexadecimal color string to a Float32Array with RGBA values.
 * Supports multiple hex formats including 3, 6, and 8 character representations.
 *
 * @example
 * ```typescript
 * // 3-character hex (RGB)
 * hexToFloat32Array('#f0f'); // Returns [1, 0, 1, 1]
 *
 * // 6-character hex (RGB)
 * hexToFloat32Array('#ff00ff'); // Returns [1, 0, 1, 1]
 *
 * // 8-character hex (RGBA)
 * hexToFloat32Array('#ff00ff80'); // Returns [1, 0, 1, 0.502]
 *
 * // Without hash prefix
 * hexToFloat32Array('ff00ff'); // Returns [1, 0, 1, 1]
 * ```
 *
 * @param {string} hex - The hexadecimal color string. Can start with '#' or not.
 *                       Supports formats: '#rgb', '#rrggbb', '#rrggbbaa'
 * @param {Float32Array} [out] - Optional pre-allocated Float32Array to store the result.
 *                               If not provided, a new Float32Array will be created.
 * @returns {Float32Array} A Float32Array with 4 elements [r, g, b, a] where each value is between 0 and 1
 * @throws {Error} Throws an error if the hex string format is invalid (not 3, 6, or 8 characters after removing '#')
 */
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

/**
 * Parses various color formats into a Float32Array with RGBA values.
 * Provides a unified interface for handling different color representations.
 *
 * @example
 * ```typescript
 * // String hex color
 * parseColor('#ff0000'); // Returns [1, 0, 0, 1]
 * parseColor('00ff00'); // Returns [0, 1, 0, 1]
 *
 * // Number color (0xRRGGBBAA format)
 * parseColor(0xff0000ff); // Returns [1, 0, 0, 1]
 * parseColor(0x00ff0080); // Returns [0, 1, 0, 0.502]
 *
 * // Float32Array pass-through
 * const color = new Float32Array([0.5, 0.5, 0.5, 1]);
 * parseColor(color); // Returns the same array
 *
 * // With output array
 * const output = new Float32Array(4);
 * parseColor('#ff0000', output); // Fills output array and returns it
 * ```
 *
 * @param {number | string | Float32Array} hex - The color to parse. Can be:
 *                                               - A hex string (e.g., '#ff0000' or 'ff0000')
 *                                               - A number in 0xRRGGBBAA format (32-bit integer)
 *                                               - A Float32Array that will be returned as-is
 * @param {Float32Array} [out] - Optional pre-allocated Float32Array to store the result.
 *                               Only used when hex is a string or number.
 * @returns {Float32Array} A Float32Array with 4 elements [r, g, b, a] where each value is between 0 and 1
 * @throws {Error} Throws an error if hex is a string with invalid format
 */
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
