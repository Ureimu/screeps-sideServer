import { BuildableStructureConstant, ControllerLevel } from "utils/common/type";
import { GridMap } from "utils/RoomGridMap";
import { SvgCode } from "utils/SvgCode";
import { hohoLayout } from "./hohoLayout";

export function a11x11(map: GridMap): void {
    const existArea = map
        .findArea(
            [
                {
                    name: "13x13",
                    coordList: map.rectPosList({ xMin: 0, xMax: 50, yMin: 0, yMax: 50 }),
                    type: "every"
                }
            ],
            map.rectPosList({ xMin: 0, xMax: 12, yMin: 0, yMax: 12 }, { ignoreWall: true, ignoreBorderLimit: true })
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
        const range = map.getRange(area.result);
        return (
            new SvgCode(range)
                // .rect({ xMin: 0, xMax: range.width, yMin: 0, yMax: range.height })
                .text(`${area.result.filter(coord => map.gridPos(coord).terrain === "swamp").length}`, { x: 0, y: 0 })
        );
    });

    map.visualizeDataList.push(...svgList);
    const bestArea = existArea[0];

    const bestRange = map.getRange(bestArea.result);
    const centerPos = { x: (bestRange.xMax + bestRange.xMin) / 2, y: (bestRange.yMax + bestRange.yMin) / 2 };
    Object.entries(hohoLayout).forEach(([level, data]) => {
        Object.entries(data).forEach(([structureType, posList]) => {
            map.addStructure(
                structureType as BuildableStructureConstant,
                Number(level) as ControllerLevel,
                0,
                ...posList.map(([x, y]) => {
                    return { x: x + centerPos.x, y: y + centerPos.y };
                })
            );
        });
    });
}
