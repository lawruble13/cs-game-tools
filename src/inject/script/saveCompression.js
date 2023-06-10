import { decompressFromBase64 } from "lz-string";
import brotliPromise from 'brotli-wasm';
import { Buffer } from "buffer";
window.brotli = await brotliPromise;

// Code to use brotli for improved compression removed due to memory
// leak in the brotli-compress library

export async function csgtCompressSave(saveData, stringify=false) {
    var data;
    if (stringify) {
        data = JSON.stringify(saveData);
    } else {
        data = saveData;
    }
    const compressedArr = await window.brotli.compress(new TextEncoder().encode(data));
    const tmp = Buffer.from(compressedArr).toString("base64");
    // const tmp = compressToBase64(data);
    return tmp;
}

export async function csgtDecompressSave(saveData, parse=false) {
    var buf;
    var str;
    try {
        buf = await window.brotli.decompress(Buffer.from(saveData, "base64"));
    } catch (error) {
        buf = new Uint8Array();
    }
    if (buf.length > 0) {
        const decoder = new TextDecoder("utf-8");
        str = decoder.decode(buf);
    } else {
        str = decompressFromBase64(saveData);
    }
    if (parse)
        return JSON.parse(str);
    return str;
}
