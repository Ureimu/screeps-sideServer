/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { AnyRoomObjects } from "node-ts-screeps-api/dist/src/rawApiType/roomObjects";
import sharp from "sharp";
import { BaseObjectInfo } from "utils/common/type";
import { getObjectPictureBuffer } from "./imgMap";

export class DrawMap {
    public test: boolean;
    public constructor() {
        this.test = true;
    }
    private terrainMap: { "0": "plain"; "1": "wall"; "2": "swamp"; "3": "wall" } = {
        "0": "plain",
        "1": "wall",
        "2": "swamp",
        "3": "wall"
    };
    /**
     * 一次布局超过166个图片在测试中会导致未知错误，只好采取折中
     *
     * @param {sharp.OverlayOptions[]} compositeInput
     * @param {string} outputPath
     * @returns {Promise<void>}
     * @memberof DrawMap
     */
    public async compositeLayout(
        compositeInput: sharp.OverlayOptions[],
        outputPath: string,
        drawOverOrigin: boolean
    ): Promise<void> {
        // 一次布局超过166（？）个图片在测试中会导致未知错误（没有任何被抛出的报错），只好进行多次读写。这个数量不确定，感觉和机器性能有关
        const onceNum = 20;

        const compLength = compositeInput.length;
        if (!drawOverOrigin) {
            await sharp("src\\utils\\blockVisual\\imgs\\bg.png").toFile(outputPath);
        }

        for (let i = 0; i < Math.ceil(compLength / onceNum); i++) {
            const newBuffer = await sharp(outputPath).toBuffer();
            const sharpInstance = sharp(newBuffer);
            await sharpInstance
                .composite(
                    compositeInput.slice(i * onceNum, (i + 1) * onceNum > compLength ? compLength : (i + 1) * onceNum)
                )
                .toFile(outputPath);
        }
    }
    public async drawTerrainLayout(terrain: string, outputPath = "output.jpg"): Promise<string> {
        const terrainPicBuffer: { [name: string]: Buffer } = {
            wall: await getObjectPictureBuffer("wall"),
            swamp: await getObjectPictureBuffer("swamp")
            // plain: await getObjectPictureBuffer("plain")
        };
        const compositeInput = _.flatten(
            Array(50)
                .fill(0)
                .map((_m, x) => {
                    return Array(50)
                        .fill(0)
                        .map((_n, y) => {
                            return {
                                top: y * 16,
                                left: x * 16,
                                input: terrainPicBuffer[this.terrainMap[terrain[x + y * 50] as "0" | "1" | "2" | "3"]]
                            };
                        });
                })
        ).filter(val => val.input);
        await this.compositeLayout(compositeInput, outputPath, false);
        return "ok";
    }
    public async drawObjectLayout(objects: BaseObjectInfo[], outputPath = "output.jpg"): Promise<void> {
        const objectPicBuffer: { [name: string]: Buffer } = {
            constructedWall: await getObjectPictureBuffer("constructedWall"),
            container: await getObjectPictureBuffer("container"),
            controller: await getObjectPictureBuffer("controller"),
            extension: await getObjectPictureBuffer("extension"),
            factory: await getObjectPictureBuffer("factory"),
            lab: await getObjectPictureBuffer("lab"),
            link: await getObjectPictureBuffer("link"),
            nuker: await getObjectPictureBuffer("nuker"),
            observer: await getObjectPictureBuffer("observer"),
            powerSpawn: await getObjectPictureBuffer("powerSpawn"),
            rampart: await getObjectPictureBuffer("rampart"),
            road: await getObjectPictureBuffer("road"),
            source: await getObjectPictureBuffer("source"),
            spawn: await getObjectPictureBuffer("spawn"),
            storage: await getObjectPictureBuffer("storage"),
            terminal: await getObjectPictureBuffer("terminal"),
            tower: await getObjectPictureBuffer("tower"),
            Z: await getObjectPictureBuffer("Z"),
            U: await getObjectPictureBuffer("U"),
            L: await getObjectPictureBuffer("L"),
            K: await getObjectPictureBuffer("K"),
            X: await getObjectPictureBuffer("X"),
            O: await getObjectPictureBuffer("O"),
            H: await getObjectPictureBuffer("H")
        };
        const compositeInput = objects
            .map(objectHere => {
                const { x, y, type } = objectHere;
                if (type !== "mineral") {
                    return {
                        top: y * 16,
                        left: x * 16,
                        input: objectPicBuffer[type]
                    };
                } else {
                    if (!objectHere.mineralType) throw new Error("unknown mineralType");
                    return {
                        top: y * 16,
                        left: x * 16,
                        input: objectPicBuffer[objectHere.mineralType]
                    };
                }
            })
            .filter(val => val.input);
        await this.compositeLayout(compositeInput, outputPath, true);
    }
    public async getProperlyDirectionOfVisual(outputPath = "output.jpg"): Promise<void> {
        const newBuffer = await sharp(outputPath).toBuffer();
        await sharp(newBuffer).flip().rotate(-90).toFile(outputPath);
    }
    public async getVisual(terrain: string, objects: BaseObjectInfo[], outputPath = "output.jpg"): Promise<void> {
        await this.drawTerrainLayout(terrain, outputPath);
        await this.drawObjectLayout(objects, outputPath);
        // await this.getProperlyDirectionOfVisual(outputPath);
    }
}
