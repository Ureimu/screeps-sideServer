import { getMinCut } from "utils/mincut/minCut";
import { GridMap } from "utils/RoomGridMap";
import { fixedLayout } from "../utils/fixedLayout";
import { hohoLayout } from "./hohoLayout";

export function a11x11(map: GridMap): boolean {
    fixedLayout(map, hohoLayout);
    if (!map.centerPos) return false;
    const centerPos = map.centerPos;
    const sources = map.findObjects("source");
    let hasPutLinkAtLevel6 = false;
    sources.forEach(source => {
        const result = map.findPath(centerPos, source, 1);
        if (result.isFinish) {
            const containerPos = result.path.pop();
            if (!containerPos) return;
            map.addStructure("sourceAndControllerRoad", 0, 0, ...result.path);
            map.addStructure("sourceContainer", 0, 0, containerPos);
            const linkPos = map.squarePos(containerPos, 1)[0];
            if (!linkPos) return;
            if (!hasPutLinkAtLevel6) {
                map.addStructure("sourceLink", 6, 8, linkPos);
                hasPutLinkAtLevel6 = true;
            } else {
                map.addStructure("sourceLink", 7, 8, linkPos);
            }

            map.setCost(containerPos, map.MAX_COST / 2);
        }
    });
    const controller = map.findObjects("controller")[0];
    const controllerRoadResult = map.findPath(centerPos, controller, 3);
    if (controllerRoadResult.isFinish) {
        const containerPos = controllerRoadResult.path.pop();
        if (!containerPos) return false;
        map.addStructure("sourceAndControllerRoad", 0, 0, ...controllerRoadResult.path);
        map.addStructure("controllerContainer", 0, 0, containerPos);
        const linkPos = map.squarePos(containerPos, 1)[0];
        if (!linkPos) return false;
        map.addStructure("controllerLink", 5, 10, linkPos);
        map.setCost(containerPos, map.MAX_COST / 2);
    }
    const mineral = map.findObjects("mineral")[0];
    map.addStructure("extractor", 7, 1, mineral);
    const mineralRoadResult = map.findPath(centerPos, mineral, 1);
    if (mineralRoadResult.isFinish) {
        const containerPos = mineralRoadResult.path.pop();
        if (!containerPos) return false;
        map.addStructure("mineralRoad", 0, 0, ...mineralRoadResult.path);
        map.addStructure("mineralContainer", 0, 0, containerPos);
        map.setCost(containerPos, map.MAX_COST / 2);
    }

    const rampartPos = getMinCut(map);
    map.addStructure("rampart", 8, 1, ...rampartPos);

    map.centerPos = centerPos;
    // console.log(map.layoutStructures.filter(i => i.type === "rampart"));
    return true;
}
