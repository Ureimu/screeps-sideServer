/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { AnyRoomObjects } from "node-ts-screeps-api/dist/src/rawApiType/roomObjects";
import sharp from "sharp";
import { BaseObjectInfo } from "utils/common/type";
import { Coord } from "utils/Grid/type";
import { getObjectPictureBuffer } from "./imgMap";

export class DrawMap {
    public test: boolean;
    public readonly rangeSettings: { xMin: number; yMin: number; xMax: number; yMax: number } = {
        xMin: 1,
        yMin: 1,
        xMax: 48,
        yMax: 48
    };
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
    private ifInBorder(x: number, y: number): boolean {
        const { xMin, yMin, xMax, yMax } = this.rangeSettings;
        if (x < xMin || y < yMin || x > xMax || y > yMax) {
            return false;
        } else {
            return true;
        }
    }
    public squarePos(pos: Coord, range: number): Coord[] {
        const { x, y } = pos;
        const coordList = [];
        for (let i = -range; i <= range; i++) {
            for (let j = -range; j <= range; j++) {
                if (this.ifInBorder(x + i, y + j) && !(i === 0 && j === 0)) {
                    coordList.push({ x: x + i, y: y + j });
                }
            }
        }
        return coordList;
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
            road: await getObjectPictureBuffer("road_big"),
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
            H: await getObjectPictureBuffer("H"),
            roadNS: await getObjectPictureBuffer("road_N-S"),
            roadEW: await getObjectPictureBuffer("road_W-E"),
            roadWNES: await getObjectPictureBuffer("road_WN-ES"),
            roadENWS: await getObjectPictureBuffer("road_EN-WS")
        };
        const compositeInput = objects
            .map(objectHere => {
                const { x, y, type } = objectHere;
                if (type !== "mineral") {
                    return {
                        top: y * 16,
                        left: x * 16,
                        input: objectPicBuffer[type],
                        type: objectHere.type,
                        x,
                        y
                    };
                } else {
                    if (!objectHere.mineralType) throw new Error("unknown mineralType");
                    return {
                        top: y * 16,
                        left: x * 16,
                        input: objectPicBuffer[objectHere.mineralType],
                        type: objectHere.type,
                        x,
                        y
                    };
                }
            })
            .filter(val => val.input);
        // 画路
        const roadInput = compositeInput.filter(val => val.type === "road");
        roadInput.map(road =>
            this.squarePos(road, 1).forEach(nearRoad => {
                const nearIndex = roadInput.findIndex(
                    roadHere => roadHere.x === nearRoad.x && roadHere.y === nearRoad.y
                );
                // 没有去掉重复渲染的路，几乎没有性能影响
                if (nearIndex !== -1) {
                    const dx = road.x - nearRoad.x;
                    const dy = road.y - nearRoad.y;

                    const posStr = (coord: Coord) => `${coord.x},${coord.y}`;
                    const directionStr = posStr({ x: dx, y: dy });
                    console.log(posStr({ x: dx, y: dy }), posStr(road), posStr(nearRoad));
                    const directionList: { [name: string]: string } = {
                        "0,1": "roadNS",
                        "0,-1": "roadNS",
                        "1,0": "roadEW",
                        "-1,0": "roadEW",
                        "1,1": "roadWNES",
                        "-1,-1": "roadWNES",
                        "-1,1": "roadENWS",
                        "1,-1": "roadENWS"
                    };
                    compositeInput.push({
                        top: road.top - 8 * dy,
                        left: road.left - 8 * dx,
                        input: objectPicBuffer[directionList[directionStr]],
                        type: directionList[directionStr],
                        x: -1,
                        y: -1
                    });
                }
            })
        );
        // rampart 放在最后渲染
        compositeInput.sort((a, b) => {
            if (a.type === "rampart") {
                if (b.type === "rampart") return 0;
                else return 1;
            } else {
                if (b.type === "rampart") return -1;
                else return 0;
            }
        });
        await this.compositeLayout(compositeInput, outputPath, true);
    }
    public async getVisual(terrain: string, objects: BaseObjectInfo[], outputPath = "output.jpg"): Promise<void> {
        await this.drawTerrainLayout(terrain, outputPath);
        await this.drawObjectLayout(objects, outputPath);
    }
}
