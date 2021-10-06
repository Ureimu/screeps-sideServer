import { SingleBar } from "cli-progress";
import { mkdirSync } from "fs";
import sharp from "sharp";
import { coordUnitWidth, picBasePath } from "utils/common/constants";
import { BaseObjectInfo, StructureConstant } from "utils/common/type";
import { Coord } from "utils/Grid/type";
import { getStructureTypeBySpecifiedName } from "utils/RoomGridMap/nameList";
import { SpecifiedStructureNameList } from "utils/RoomGridMap/type";
import { SvgCode } from "utils/SvgCode";
import { getObjectPictureBuffer } from "./imgMap";

export class DrawMap {
    public test: boolean;
    public readonly rangeSettings: { xMin: number; yMin: number; xMax: number; yMax: number } = {
        xMin: 0,
        yMin: 0,
        xMax: 49,
        yMax: 49
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
        drawBaseSize: [number, number] | false,
        label: string
    ): Promise<void> {
        // 一次布局超过166（？）个图片在测试中会导致stack overflow error（没有任何被抛出的报错），只好进行多次读写。这个数量不确定，感觉和机器性能有关.
        // 但是多次读写对运行时间影响不大。
        // 参见 https://github.com/lovell/sharp/issues/2286
        const startTime = Date.now();
        const onceNum = 100;
        const compLength = compositeInput.length;
        if (drawBaseSize) {
            const baseSize = [drawBaseSize[0] * coordUnitWidth, drawBaseSize[1] * coordUnitWidth];
            await sharp(`${picBasePath}bg.png`)
                .resize(...baseSize)
                .toFile(outputPath);
        }
        let bufferCache = await sharp(outputPath).toBuffer();
        let lastEndTime = Date.now();
        // const profilerStr = (startTimeH: number, endTimeH: number, compLengthH: number, subLabel: string) =>
        //     `${label} ${subLabel} ${outputPath} ${endTimeH - startTimeH}ms length ${compLength + 1} perPic ${(
        //         (endTimeH - startTimeH) /
        //         compLengthH
        //     ).toFixed(3)}ms`;
        for (let i = 0; i < Math.ceil(compLength / onceNum); i++) {
            const sharpInstance = sharp(bufferCache);
            const sliceData = compositeInput.slice(
                i * onceNum,
                (i + 1) * onceNum > compLength + 1 ? compLength + 1 : (i + 1) * onceNum
            );
            bufferCache = await sharpInstance.composite(sliceData).toBuffer();
            // console.log(profilerStr(lastEndTime, Date.now(), sliceData.length, "[composite]"));
            lastEndTime = Date.now();
        }
        await sharp(bufferCache).toFile(outputPath);
        const endTime = Date.now();
        // console.log(profilerStr(startTime, endTime, compLength + 1, "[composite,toFile]"));
    }
    public async drawTerrainLayout(
        terrain: string,
        mapSize: [xLength: number, yLength: number],
        outputPath = "output.jpg"
    ): Promise<string> {
        const terrainPicBuffer: { [name: string]: Buffer } = {
            wall: await getObjectPictureBuffer("wall"),
            swamp: await getObjectPictureBuffer("swamp")
            // plain: await getObjectPictureBuffer("plain")
        };
        const [xMax, yMax] = mapSize;
        const compositeInput = _.flatten(
            Array(xMax)
                .fill(0)
                .map((_m, x) => {
                    return Array(yMax)
                        .fill(0)
                        .map((_n, y) => {
                            return {
                                top: y * coordUnitWidth,
                                left: x * coordUnitWidth,
                                input: terrainPicBuffer[this.terrainMap[terrain[x + y * xMax] as "0" | "1" | "2" | "3"]]
                            };
                        });
                })
        ).filter(val => val.input);
        await this.compositeLayout(compositeInput, outputPath, mapSize, "[drawTerrainLayout]");
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
            extractor: await getObjectPictureBuffer("extractor"),
            factory: await getObjectPictureBuffer("factory"),
            lab: await getObjectPictureBuffer("lab"),
            link: await getObjectPictureBuffer("link"),
            nuker: await getObjectPictureBuffer("nuker"),
            observer: await getObjectPictureBuffer("observer"),
            powerSpawn: await getObjectPictureBuffer("powerSpawn"),
            rampart: await getObjectPictureBuffer("rampart"),
            road: await getObjectPictureBuffer("road_dot"),
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
                const structureType = getStructureTypeBySpecifiedName(type);
                // if (structureType === "link" || structureType === "road") console.log(type);
                // if (structureType === "rampart") console.log(type, Boolean(objectPicBuffer[structureType]));
                if (type !== "mineral") {
                    return {
                        top: y * coordUnitWidth,
                        left: x * coordUnitWidth,
                        input: objectPicBuffer[structureType],
                        type: structureType,
                        x,
                        y
                    };
                } else {
                    if (!objectHere.mineralType) throw new Error("unknown mineralType");
                    return {
                        top: y * coordUnitWidth,
                        left: x * coordUnitWidth,
                        input: objectPicBuffer[objectHere.mineralType],
                        type: structureType,
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
                    // console.log(posStr({ x: dx, y: dy }), posStr(road), posStr(nearRoad));
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
                        top: road.top - (coordUnitWidth / 2 - coordUnitWidth / 16) * dy,
                        left: road.left - (coordUnitWidth / 2 - coordUnitWidth / 16) * dx,
                        input: objectPicBuffer[directionList[directionStr]],
                        type: directionList[directionStr],
                        x: -1,
                        y: -1
                    });
                }
            })
        );
        // road 放在最前渲染
        compositeInput.sort((b, a) => {
            const typeNameList = ["road", "roadNS", "roadEW", "roadWNES", "roadENWS"];
            if (typeNameList.includes(a.type)) {
                if (typeNameList.includes(b.type)) return 0;
                else return 1;
            } else {
                if (typeNameList.includes(b.type)) return -1;
                else return 0;
            }
        });
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
        await this.compositeLayout(compositeInput, outputPath, false, "[drawObjectLayout]");
    }
    public mulConst = coordUnitWidth;
    public async addSVG(svgCode: SvgCode, outputPath = "output.jpg"): Promise<void> {
        const dataBuffer = await sharp(Buffer.from(svgCode.code())).toBuffer();
        // console.log(svgCode.code());
        await this.compositeLayout(
            [
                {
                    top: svgCode.range.yMin * coordUnitWidth,
                    left: svgCode.range.xMin * coordUnitWidth,
                    input: dataBuffer
                }
            ],
            outputPath,
            false,
            "[addSVG]"
        );
    }
    public async drawVisualData(dataList: SvgCode[], outputPath = "output.jpg"): Promise<void> {
        const dataBufferList = await Promise.all(
            dataList.map(svgCode => sharp(Buffer.from(svgCode.code())).toBuffer())
        );
        const compositeDataList = dataList.map((svgCode, index) => {
            return {
                top: svgCode.range.yMin * coordUnitWidth,
                left: svgCode.range.xMin * coordUnitWidth,
                input: dataBufferList[index]
            };
        });
        await this.compositeLayout(compositeDataList, outputPath, false, "[drawVisualData]");
    }
    public async getVisual(
        terrain: string,
        objects: BaseObjectInfo[],
        visualDataList: SvgCode[],
        progressBar?: SingleBar,
        outputPath = "output.jpg",
        size = [50, 50] as [number, number]
    ): Promise<void> {
        await this.drawTerrainLayout(terrain, size, outputPath);
        progressBar?.increment(333);
        await this.drawObjectLayout(objects, outputPath);
        progressBar?.increment(334);
        await this.drawVisualData(visualDataList, outputPath);
        progressBar?.increment(333);
    }
}
