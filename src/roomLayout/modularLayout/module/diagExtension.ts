import { BuildableStructureConstant } from "utils/common/type";
import { GridMap } from "utils/RoomGridMap";
import { SpecifiedStructureNameList } from "utils/RoomGridMap/type";
import { StructureStrMap } from "../LayoutStr/class";
import { ModuleLayoutData } from "./type";
export const layout = `
    r
  r e r
r e e e r
  r e r
    r
`;
export const mapChar: StructureStrMap = {
    r: "baseRoad",
    e: "extension"
};

const diagExtensionSetting: ModuleLayoutData = {
    layout: {
        extension: [
            [0, 0],
            [0, -1],
            [0, 1],
            [1, 0],
            [-1, 0]
        ],
        baseRoad: [
            [2, 0],
            [1, 1],
            [0, 2],
            [-1, 1],
            [-2, 0],
            [-1, -1],
            [0, -2],
            [1, -1]
        ]
    }
};

export function diagExtension(map: GridMap): void {
    const coordList = Object.values(diagExtensionSetting.layout)
        .flat(1)
        .map(([x, y]) => {
            return { x, y };
        });
    const size = GridMap.getRange(coordList);
    const existArea = map
        .findArea(
            [
                {
                    name: `diagExtension${size.width}x${size.height}`,
                    coordList: map.rectPosList({ xMin: 5, xMax: 44, yMin: 5, yMax: 44 }),
                    type: "every"
                }
            ],
            coordList
        )
        .sort(
            (a, b) =>
                a.result.filter(coord => map.gridPos(coord).terrain === "swamp").length -
                b.result.filter(coord => map.gridPos(coord).terrain === "swamp").length
        );
}
