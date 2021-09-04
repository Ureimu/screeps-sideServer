import sharp from "sharp";

const map: { [name: string]: string } = {
    controller: "rcl8.png"
};
const bufferCache: { [name: string]: Buffer } = {};
export async function getObjectPictureBuffer(name: string): Promise<Buffer> {
    if (bufferCache[name]) return bufferCache[name];
    const basePath = "src/utils/blockVisual/imgs/";
    const fullPath = basePath + (map[name] ?? `${name}.png`);
    const buffer = await sharp(fullPath).resize(16, 16).toBuffer();
    bufferCache[name] = buffer;
    return buffer;
}
