import { Coord } from "utils/Grid/type";
import { GridMap } from "utils/RoomGridMap";

export function ecoLayout(map: GridMap): void {
    const sources = map.findObjects("source");
    const controller = map.findObjects("controller")[0];
    // 在source周围修extension
    sources.forEach(source => {
        const sourceNearPos = map.squarePos(source, 1, { ignoreUnwalkable: true });
        const area = map.findArea(
            [{ name: "sourceNearPos", coordList: [...map.hollowSquarePos(source, 1)], type: "some" }],
            [source, ...sourceNearPos]
        );
        const bestArea =
            area[
                area.reduce(
                    (pre, { result: resultHere }, index) => {
                        const nearResult = map.nearPos(resultHere, 1);
                        if (nearResult.length > pre.length) {
                            pre.length = nearResult.length;
                            pre.index = index;
                        }
                        return pre;
                    },
                    { index: -1, length: 0 }
                ).index
            ];
        const result = bestArea?.result;
        const limitCoord = bestArea?.limit[0].coordList;
        console.log(result);
        if (result) {
            map.addStructure("baseRoad", 1, 10, ...result);
            map.addStructure("sourceContainer", 1, 10, result[0]);
            const posNearRoad = map.nearPos(result, 1);

            // 从sourceContainer到controller的路
            const path = map.findPath(result[0], controller, 1, {
                costList: [
                    ...sourceNearPos.map(coord => {
                        return { ...coord, cost: map.MAX_COST };
                    })
                ]
            }).path;
            path.shift();
            map.addStructure("baseRoad", 1, 10, ...path);
            if (posNearRoad.length > 3) {
                map.sortCoordByDistance(source, posNearRoad, -1);
                map.addStructure("spawn", 7, 1, posNearRoad.pop() as Coord);
                map.addStructure("sourceLink", 7, 1, posNearRoad.pop() as Coord);
            }

            map.addStructure("extension", 5, 1, ...posNearRoad);
        }
    });
    // 绕着controller修一圈路

    const blankSpace = map.hollowSquarePos(controller, 4);
    // console.log(blankSpace);
    // map.addStructure("road", 1, 10, ...blankSpace);
}
