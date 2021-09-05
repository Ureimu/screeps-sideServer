import { GridMap } from "utils/RoomGridMap";

export function ecoLayout(map: GridMap): void {
    const sources = map.findObjects("source");
    // 在source周围修extension
    sources
        .map(source => map.squarePos(source, 1))
        .forEach(aroundCoordList => map.addStructure("extension", 1, 10, ...aroundCoordList));

    // 绕着controller修一圈路
    const controller = map.findObjects("controller")[0];
    const blankSpace = map.hollowSquarePos(controller, 4);
    console.log(blankSpace);
    // map.addStructure("road", 1, 10, ...blankSpace);

    // 从source到controller的路
    const path = map.findPath(sources[0], controller, 1).path;
    path.shift();
    map.addStructure("road", 1, 10, ...path);
}
