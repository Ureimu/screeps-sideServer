import { Coord } from "utils/Grid/type";
import { GridMap } from "utils/RoomGridMap";

// 返回的freeSpacePos数量可能不够，需要自己从buildingExpand位置取一些，或者把buildingExpand不需要的位置记录一下。
export function findSpace(
    map: GridMap,
    firstSpawnPos: Coord,
    buildingPosNum: number,
    freeSpacePosNum: number
): { buildingExpand: Set<string>; roadExpand: Set<string>; freeSpaceExpand: Set<string>; isExist: boolean } {
    const buildingExpand = new Set([map.posStr(firstSpawnPos)]);
    const roadExpand = new Set(map.mod2notEqualPos(firstSpawnPos, 1).map(map.posStr));
    // 建筑和路旁的空位。
    const fullFreeSpaceExpand = new Set<string>();
    let ifNotEnough = true;
    let num = 0;
    while (ifNotEnough) {
        // 判断数量是否足够
        // 进行一次扩张，如果没有墙和沼泽阻碍扩张，则会增加4n-4个空位(n>2)
        let ExpandList: string[] = [];
        roadExpand.forEach((posStr: string) => {
            map.mod2equalPos(map.prasePosStr(posStr), 1).forEach(pos => {
                ExpandList.push(map.posStr(pos));
            });
        });
        // console.log(Array.from(roadExpand.keys()));
        ExpandList.forEach(pos => {
            roadExpand.add(pos);
        });
        ExpandList = [];
        buildingExpand.forEach((posStr: string) => {
            map.mod2equalPos(map.prasePosStr(posStr), 1).forEach(pos => {
                ExpandList.push(map.posStr(pos));
            });
        });
        // console.log(Array.from(buildingExpand.keys()));
        ExpandList.forEach(pos => {
            buildingExpand.add(pos);
        });

        // _判断实际可用空位数量
        buildingExpand.forEach(posStr => {
            const pos = map.prasePosStr(posStr);
            if (!map.isNotCloseToWalkableBorder([pos], 5)) {
                buildingExpand.delete(posStr);
            }
        });
        roadExpand.forEach(posStr => {
            const pos = map.prasePosStr(posStr);
            if (!map.isNotCloseToWalkableBorder([pos], 4)) {
                roadExpand.delete(posStr);
            }
        });
        // __判断是否在controller4格范围内或者source2格范围内或者mineral的1格范围内，是则弹出集合
        // ___取得范围内的位置字符串集合，并进行删除。
        map.squarePos(map.objects.filter(i => i.type === "controller")[0], 4).forEach(pos => {
            const posStr = map.posStr(pos);
            roadExpand.delete(posStr);
            buildingExpand.delete(posStr);
        });
        for (const source of map.objects.filter(i => i.type === "source")) {
            map.squarePos(source, 2).forEach(pos => {
                const posStr = map.posStr(pos);
                roadExpand.delete(posStr);
                buildingExpand.delete(posStr);
            });
        }
        map.squarePos(map.objects.filter(i => i.type === "mineral")[0], 1).forEach(pos => {
            const posStr = map.posStr(pos);
            roadExpand.delete(posStr);
            buildingExpand.delete(posStr);
        });
        // __判断是否building周围还有路，没有则弹出集合
        for (const buildingExpandPosStr of buildingExpand) {
            const buildingExpandPos = map.prasePosStr(buildingExpandPosStr);
            const buildingExpandPosAround = map.squarePos(buildingExpandPos, 1);
            let j = 0;
            for (const buildingExpandPosAroundPos of buildingExpandPosAround) {
                const terrain = map.gridPos(buildingExpandPosAroundPos).terrain;
                if (terrain === "wall" || !roadExpand.has(map.posStr(buildingExpandPosAroundPos))) {
                    j++;
                }
            }
            if (j === 8) {
                buildingExpand.delete(map.posStr(buildingExpandPos));
            }
        }
        // __判断是否路周围还有building，没有则放弃(暂时不使用，因为极端情况下可能需要路来作为连通图的桥,而作者还写不来连通图的算法)

        // 判断方格数量是否足够放下所有需要占位的building
        // console.log(buildingExpand.size);
        if (buildingExpand.size === num) {
            // console.log(num, m);
            // console.log("无法在此位置寻找到合适布局。");
            return { buildingExpand, roadExpand, freeSpaceExpand: fullFreeSpaceExpand, isExist: false };
        }
        num = buildingExpand.size;
        if (buildingPosNum <= buildingExpand.size) {
            ifNotEnough = false;
        }
    }
    // console.log(num, m);
    map.mod2notEqualPos(firstSpawnPos, 1)
        .map(map.posStr)
        .forEach(str => roadExpand.add(str));

    // 将所有路周围，不属于roadExpand和buildingExpand的位置加入
    for (const roadPosStr of roadExpand) {
        const roadPos = map.prasePosStr(roadPosStr);
        const nearbyPosList = map.hollowSquarePos(roadPos, 1, {
            ignoreBorderLimit: false,
            ignoreStructure: false,
            ignoreUnwalkable: false
        });
        nearbyPosList.forEach(nearbyPos => {
            const nearbyPosStr = map.posStr(nearbyPos);
            if (!roadExpand.has(nearbyPosStr) && !buildingExpand.has(nearbyPosStr)) {
                fullFreeSpaceExpand.add(nearbyPosStr);
            }
        });
    }
    const freeSpaceExpandArray = Array.from(fullFreeSpaceExpand.values())
        .map(i => map.prasePosStr(i))
        .filter(i => map.getDistance(i, firstSpawnPos) <= 8)
        .sort((a, b) => map.getDistance(firstSpawnPos, a) - map.getDistance(firstSpawnPos, b))
        .map(i => map.posStr(i));

    if (freeSpaceExpandArray.length >= freeSpacePosNum) {
        freeSpaceExpandArray.splice(freeSpacePosNum);
    }

    const freeSpaceExpand = new Set(freeSpaceExpandArray);
    return { buildingExpand, roadExpand, freeSpaceExpand, isExist: true };
}
