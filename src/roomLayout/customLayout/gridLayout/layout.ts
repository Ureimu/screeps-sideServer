import { Coord } from "utils/Grid/type";
import { GridMap } from "utils/RoomGridMap";

export function gridLayout(map: GridMap): void {
    const result = map.grid.map(xStack => {
        return xStack.map(firstSpawnPosGrid => {
            if (firstSpawnPosGrid.cost === map.MAX_COST) {
                return { x: firstSpawnPosGrid.x, y: firstSpawnPosGrid.y, isGood: false };
            } else {
                const aMap = new GridMap(map.terrainData, map.objects, map.roomName, map.name);
                if (gridBasedFirstSpawn(aMap, firstSpawnPosGrid)) {
                    return { x: firstSpawnPosGrid.x, y: firstSpawnPosGrid.y, isGood: true };
                } else {
                    return { x: firstSpawnPosGrid.x, y: firstSpawnPosGrid.y, isGood: false };
                }
            }
        });
    });
}

function gridBasedFirstSpawn(map: GridMap, firstSpawnPos: Coord): boolean {
    const buildingPos = map.mod2equalPos(firstSpawnPos, 50);
    const roadPos = map.mod2notEqualPos(firstSpawnPos, 50);
    buildingPos.sort((a, b) => {
        return map.getDistance(a, firstSpawnPos) - map.getDistance(b, firstSpawnPos);
    });
    roadPos.sort((a, b) => {
        return map.getDistance(a, firstSpawnPos) - map.getDistance(b, firstSpawnPos);
    });
    map.addStructure("baseRoad", 0, 0, ...roadPos);
    return true;
}
