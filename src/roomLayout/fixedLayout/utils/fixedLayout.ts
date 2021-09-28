import { BuildableStructureConstant, ControllerLevel, Range } from "utils/common/type";
import { Coord } from "utils/Grid/type";
import { GridMap } from "utils/RoomGridMap";
import { SpecifiedStructureNameList } from "utils/RoomGridMap/type";
import { SvgCode } from "utils/SvgCode";

export interface FixedLayoutData {
    requireData: { [level: number]: typedRequireData };
    size: { width: number; height: number };
    range: Range;
    centerPos: Coord;
}

interface typedRequireData {
    [structureType: string]: [x: number, y: number][];
}

export function fixedLayout(map: GridMap, layoutData: FixedLayoutData): void {
    const existArea = map
        .findArea(
            [
                {
                    name: `${layoutData.size.width}x${layoutData.size.height}`,
                    coordList: map.rectPosList({ xMin: 5, xMax: 44, yMin: 5, yMax: 44 }),
                    type: "every"
                }
            ],
            map.rectPosList(
                { xMin: 1, xMax: layoutData.size.width, yMin: 1, yMax: layoutData.size.height },
                { ignoreWall: true, ignoreBorderLimit: true }
            )
        )
        .sort(
            (a, b) =>
                a.result.filter(coord => map.gridPos(coord).terrain === "swamp").length -
                b.result.filter(coord => map.gridPos(coord).terrain === "swamp").length
        );
    if (!existArea[0]) {
        return;
    } else {
        console.log(map.name);
    }

    const svgList = existArea.map(area => {
        const range = GridMap.getRange(area.result);
        return new SvgCode(range);
        // .rect({ xMin: 0, xMax: range.width + 1, yMin: 0, yMax: range.height + 1 })
        // .text(`${area.result.filter(coord => map.gridPos(coord).terrain === "swamp").length}`, { x: 0, y: 0 })
    });

    map.visualizeDataList.push(...svgList);

    const bestArea = existArea[0];
    const bestRange = GridMap.getRange(bestArea.result);
    const offsetDistance = { x: bestRange.xMax - layoutData.range.xMax, y: bestRange.yMax - layoutData.range.yMax };
    Object.entries(layoutData.requireData).forEach(([level, data]) => {
        Object.entries(data).forEach(([structureType, posList]) =>
            map.addStructure(
                structureType as SpecifiedStructureNameList<BuildableStructureConstant>,
                Number(level) as ControllerLevel,
                0,
                ...posList.map(([x, y]) => {
                    return { x: x + offsetDistance.x, y: y + offsetDistance.y };
                })
            )
        );
    });
    map.centerPos = { x: layoutData.centerPos.x + offsetDistance.x, y: layoutData.centerPos.y + offsetDistance.y };
}
