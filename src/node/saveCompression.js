const LZString = require("lz-string");
const brotli = require("brotli-compress");

window.csgtCompressSave = async function csgtCompressSave(saveData, stringify=false) {
    var data;
    if (stringify) {
        data = JSON.stringify(saveData);
    } else {
        data = saveData;
    }
    const compressedArr = await brotli.compress(new TextEncoder().encode(data));
    return Buffer.from(compressedArr).toString("base64");
}

window.csgtDecompressSave = async function csgtDecompressSave(saveData) {
    var buf;
    var str;
    try {
        buf = await brotli.decompress(Buffer.from(saveData, "base64"));
    } catch (error) {
        buf = new Uint8Array();
    }
    if (buf.length > 0) {
        const decoder = new TextDecoder("utf-8");
        str = decoder.decode(buf);
    } else {
        str = LZString.decompressFromBase64(saveData);
    }
    return JSON.parse(str);
}
