import { GridMap } from "utils/RoomGridMap";

export function gridLayout(map: GridMap): void {
    map.grid.map(xStack => {
        xStack.map(firstSpawnPosGrid => {
            if (firstSpawnPosGrid.cost === map.MAX_COST) {
                return { x: firstSpawnPosGrid.x, y: firstSpawnPosGrid.y, isGood: false };
            } else {
                const aMap = new GridMap(map.terrainData, map.objects);
            }
        });
    });
    map.addStructure("spawn", 1, 100, { x: 25, y: 25 });
}
