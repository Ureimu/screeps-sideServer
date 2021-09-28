import sharp from "sharp";
import { coordUnitWidth, picBasePath } from "utils/common/constants";

const map: { [name: string]: string } = {
    controller: "rcl8.png"
};
const bufferCache: { [name: string]: Buffer } = {};
export async function getObjectPictureBuffer(name: string): Promise<Buffer> {
    if (bufferCache[name]) return bufferCache[name];
    const fullPath = picBasePath + (map[name] ?? `${name}.png`);

    const sizeList: { [name: string]: number } = {
        wall: coordUnitWidth,
        swamp: coordUnitWidth,
        extractor: coordUnitWidth,
        container: (coordUnitWidth / 4) * 3
    };
    const mineralSize = coordUnitWidth / 2;
    ["K", "L", "U", "Z", "O", "H", "X"].forEach(mineralName => {
        sizeList[mineralName] = mineralSize;
    });
    const sizeArgs = [];
    if (sizeList[name]) {
        sizeArgs.push(sizeList[name], sizeList[name]);
    } else {
        sizeArgs.push(coordUnitWidth, coordUnitWidth);
    }
    const extendPixels = (coordUnitWidth - sizeArgs[0]) / 2;
    const buffer = await sharp(fullPath)
        .resize(...sizeArgs)
        .extend({
            top: extendPixels,
            bottom: extendPixels,
            left: extendPixels,
            right: extendPixels,
            background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .toBuffer();
    bufferCache[name] = buffer;
    return buffer;
}
