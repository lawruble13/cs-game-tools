const LZString = require("lz-string");
// const brotli = require("brotli-compress");

// Code to use brotli for improved compression removed due to memory
// leak in the brotli-compress library

window.csgtCompressSave = async function csgtCompressSave(saveData, stringify=false) {
    var data;
    if (stringify) {
        data = JSON.stringify(saveData);
    } else {
        data = saveData;
    }
    // const compressedArr = await brotli.compress(new TextEncoder().encode(data));
    // const tmp = Buffer.from(compressedArr).toString("base64");
    const tmp = LZString.compressToBase64(data);
    return tmp;
}

window.csgtDecompressSave = async function csgtDecompressSave(saveData, parse=false) {
    var buf;
    var str;
    // try {
    //     buf = await brotli.decompress(Buffer.from(saveData, "base64"));
    // } catch (error) {
    //     buf = new Uint8Array();
    // }
    // if (buf.length > 0) {
    //     const decoder = new TextDecoder("utf-8");
    //     str = decoder.decode(buf);
    // } else {
        str = LZString.decompressFromBase64(saveData);
    // }
    if (parse)
        return JSON.parse(str);
    return str;
}