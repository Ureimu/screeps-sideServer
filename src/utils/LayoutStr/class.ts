import { DrawMap } from "utils/blockVisual";
import { BuildableStructureConstant } from "utils/common/type";
import { Coord } from "utils/Grid/type";
import { GridMap } from "utils/RoomGridMap";
import { SpecifiedStructureNameList } from "utils/RoomGridMap/type";
import { SvgCode } from "utils/SvgCode";

export class LayoutStr {
    public requireDataList: (Coord & { type: SpecifiedStructureNameList<BuildableStructureConstant> })[] = [];
    public terrainStr: string;
    public size;
    public constructor(public layoutStr: string, public strMap: StructureStrMap) {
        const xList: number[] = [];
        const yList: number[] = [];
        _.trimRight(_.trimLeft(layoutStr, "\n"), "\n")
            .split("\n")
            .map(strRow => {
                let originStr = "";
                for (let index = 0; index < strRow.length; index++) {
                    if (index % 2 === 0) {
                        originStr = originStr.concat(strRow[index]);
                    }
                }
                return originStr;
            })
            .forEach((strRow, y) => {
                for (let x = 0; x < strRow.length; x++) {
                    const char = strRow[x];
                    if (char === " ") continue;
                    const type = strMap[char];
                    this.requireDataList.push({ x, y, type });
                    xList.push(x);
                    yList.push(y);
                }
            });
        this.terrainStr = Array(Math.max(...xList))
            .fill(0)
            .map(() => {
                return Array(Math.max(...yList))
                    .fill(0)
                    .map(() => {
                        return "0";
                    });
            })
            .join("");
        this.size = GridMap.getRange(this.requireDataList);
    }
    public async drawPreview(output: string, svg: SvgCode[] = []): Promise<void> {
        const map = new DrawMap();
        await map.getVisual(this.terrainStr, this.requireDataList, svg, undefined, output, [
            this.size.xMax + 1,
            this.size.yMax + 1
        ]);
    }
}

export interface StructureStrMap {
    [name: string]: SpecifiedStructureNameList<BuildableStructureConstant>;
}
