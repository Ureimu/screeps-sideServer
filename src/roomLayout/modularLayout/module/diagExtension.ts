import { BuildableStructureConstant } from "utils/common/type";
import { GridMap } from "utils/RoomGridMap";
import { SpecifiedStructureNameList } from "utils/RoomGridMap/type";
import { StructureStrMap } from "utils/LayoutStr/class";
import { ModuleLayoutData } from "./type";
const layout = `
    r
  r e r
r e e e r
  r e r
    r
`;
const mapChar: StructureStrMap = {
    r: "baseRoad",
    e: "extension"
};

const diagExtensionSetting: ModuleLayoutData = {
    layout,
    mapChar
};

// export function diagExtension(map: GridMap): void {
//     const coordList = Object.values(diagExtensionSetting.layout)
//         .flat(1)
//         .map(([x, y]) => {
//             return { x, y };
//         });
//     const size = GridMap.getRange(coordList);
//     const existArea = map
//         .findArea(
//             [
//                 {
//                     name: `diagExtension`,
//                     coordList: map.rectPosList({ xMin: 5, xMax: 44, yMin: 5, yMax: 44 }),
//                     type: "every"
//                 }
//             ],
//             coordList
//         )
//         .sort(
//             (a, b) =>
//                 a.result.filter(coord => map.gridPos(coord).terrain === "swamp").length -
//                 b.result.filter(coord => map.gridPos(coord).terrain === "swamp").length
//         );
// }
