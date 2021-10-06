/* eslint-disable */
// @ts-nocheck
import { newAcrossTickTask } from "utils/AcrossTick";
import { getCutTiles } from "utils/mincut/minCut";
import { PosStr } from "utils/RoomPositionToStr";
import { GUIfun } from "utils/roomVisualGUI";
import { SetTools } from "utils/SetTools";

/** 网格建筑布局。
 * 该函数为静态函数，即只要输入相同，则输出必定相同，所以一个房间只需要执行一次。
 * 网格建筑布局是最基本也是最简单的布局之一，只需要用方格道路填满房间，再把建筑放置于方格中即可。
 * 默认不考虑一切已经建好的建筑，并且在规划完成后建筑会自动检查位置是否符合布局要求，不符合会自动重建。
 */
const keepTime = 80; // 预览的持续时间
const xUp = 0.25;
export const gridLayoutBuildNumberLimit = _.cloneDeep(CONTROLLER_STRUCTURES);

gridLayoutBuildNumberLimit.constructedWall = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 2500,
    6: 2500,
    7: 2500,
    8: 2500
};
gridLayoutBuildNumberLimit.rampart = {
    0: 0,
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 2500,
    6: 2500,
    7: 2500,
    8: 2500
};

export function ifEnoughSpace(
    room: Room,
    firstSpawnPos: string,
    opts?: { useRoomFind: boolean }
): { roadExpand: Set<string>; buildingExpand: Set<string> } | undefined {
    let cpu = Game.cpu.getUsed();
    const terrainData = room.lookForAtArea<LOOK_TERRAIN>(LOOK_TERRAIN, 0, 0, 49, 49);
    const roadExpandStrList: string[] = [];
    // 先确定中心，这里设置为了本房间第一个spawn。
    PosStr.getDiagPosStr(firstSpawnPos).forEach(pos => {
        roadExpandStrList.push(pos);
    });
    const roadExpand = new Set(roadExpandStrList);
    const buildingExpand = new Set([firstSpawnPos]);
    let ifNotEnough = true;
    let num = 0;
    while (ifNotEnough) {
        // 判断数量是否足够
        // 进行一次扩张，如果没有墙和沼泽阻碍扩张，则会增加4n-4个空位(n>2)
        let ExpandList: string[] = [];
        roadExpand.forEach((posStr: string) => {
            PosStr.getQuadPosStr(posStr).forEach(pos => {
                ExpandList.push(pos);
            });
        });
        // console.log(Array.from(roadExpand.keys()));
        ExpandList.forEach(pos => {
            roadExpand.add(pos);
        });
        ExpandList = [];
        buildingExpand.forEach((posStr: string) => {
            PosStr.getQuadPosStr(posStr).forEach(pos => {
                ExpandList.push(pos);
            });
        });
        // console.log(Array.from(buildingExpand.keys()));
        ExpandList.forEach(pos => {
            buildingExpand.add(pos);
        });

        // __判断是否可以放下road，不可以则弹出集合
        for (const roadExpandPosStr of roadExpand) {
            const roadExpandPosCoord = PosStr.parseCoord(roadExpandPosStr);
            // console.log(roadExpandPosCoord.x, roadExpandPosCoord.y);
            // console.log(terrainData[roadExpandPosCoord.y]?.[roadExpandPosCoord.x]?.[0]);
            if (
                (terrainData[roadExpandPosCoord.y]?.[roadExpandPosCoord.x]?.[0] as unknown as string) === "wall" ||
                (terrainData[roadExpandPosCoord.y]?.[roadExpandPosCoord.x]?.[0] as unknown as string) === "swamp"
            ) {
                // console.log(`road位置${roadExpandPosStr}不满足要求：terrain === "plain"，去除`);
                roadExpand.delete(roadExpandPosStr);
            }
        }

        // __判断是否可以放下building，不可以则弹出集合
        for (const buildingExpandPosStr of buildingExpand) {
            const buildingExpandPosCoord = PosStr.parseCoord(buildingExpandPosStr);
            // console.log(buildingExpandPosCoord.x, buildingExpandPosCoord.y);
            // console.log(terrainData[buildingExpandPosCoord.y]?.[buildingExpandPosCoord.x]?.[0]);
            if (
                (terrainData[buildingExpandPosCoord.y]?.[buildingExpandPosCoord.x]?.[0] as unknown as string) === "wall"
            ) {
                // console.log(`building位置${buildingExpandPosStr}不满足要求：terrain !== "wall"，去除`);
                buildingExpand.delete(buildingExpandPosStr);
            }
        }

        if (opts?.useRoomFind) {
            // _判断实际可用空位数量

            // __判断是否在controller4格范围内或者source2格范围内或者mineral的1格范围内，是则弹出集合
            // ___取得范围内的位置字符串集合，并进行删除。
            PosStr.getPosStrInRange(PosStr.setPosToStr((room.controller as StructureController).pos), 4).forEach(
                posStr => {
                    roadExpand.delete(posStr);
                    buildingExpand.delete(posStr);
                }
            );
            for (const source of room.find(FIND_SOURCES)) {
                PosStr.getPosStrInRange(PosStr.setPosToStr(source.pos), 2).forEach(posStr => {
                    roadExpand.delete(posStr);
                    buildingExpand.delete(posStr);
                });
            }
            PosStr.getPosStrInRange(PosStr.setPosToStr(room.find(FIND_MINERALS)[0].pos), 1).forEach(posStr => {
                roadExpand.delete(posStr);
                buildingExpand.delete(posStr);
            });
            // __判断是否building周围还有路，没有则弹出集合
            for (const buildingExpandPosStr of buildingExpand) {
                const buildingExpandPos = PosStr.getPosFromStr(buildingExpandPosStr);
                const buildingExpandPosAroundStr = PosStr.getSquarePosStr(PosStr.setPosToStr(buildingExpandPos));
                let j = 0;
                for (const buildingExpandPosAroundPosStr of buildingExpandPosAroundStr) {
                    const terrain: Terrain[] =
                        PosStr.getPosFromStr(buildingExpandPosAroundPosStr).lookFor(LOOK_TERRAIN);
                    if (terrain[0] === "wall" || !isPosSetInPos(roadExpand, buildingExpandPosAroundPosStr)) {
                        j++;
                    }
                }
                if (j === 8) {
                    buildingExpand.delete(PosStr.setPosToStr(buildingExpandPos));
                }
            }
            // __判断是否路周围还有building，没有则放弃(暂时不使用，因为极端情况下可能需要路来作为连通图的桥,而作者还写不来连通图的算法)
        }

        // 判断方格数量是否足够放下所有需要占位的building
        // console.log(buildingExpand.size);
        if (buildingExpand.size === num) {
            console.log("无法在此位置寻找到合适布局。");
            cpu = Game.cpu.getUsed() - cpu;
            console.log(cpu);
            return;
        }
        num = buildingExpand.size;
        if (88 <= buildingExpand.size) {
            ifNotEnough = false;
        }
    }
    // console.log(JSON.stringify(terrainData));
    // console.log("已经在此位置寻找到合适布局。");
    cpu = Game.cpu.getUsed() - cpu;
    // console.log(cpu);
    return { roadExpand, buildingExpand };
}

export function getGridLayout(room: Room): void {
    const startCpu = Game.cpu.getUsed();
    // 初始化memory
    const roadExpandStrList: string[] = [];
    // 先确定中心，这里设置为了本房间第一个spawn。
    PosStr.getDiagPosStr(PosStr.setPosToStr(Game.spawns[room.memory.construct.firstSpawnName.name].pos)).forEach(
        pos => {
            roadExpandStrList.push(pos);
        }
    );
    const returnSpace = ifEnoughSpace(
        room,
        PosStr.setPosToStr(Game.spawns[room.memory.construct.firstSpawnName.name].pos),
        {
            useRoomFind: true
        }
    );
    if (!returnSpace) {
        console.log("找不到布局，退出布局函数");
        return;
    }
    const { roadExpand, buildingExpand } = returnSpace;
    // 保留一份完整的buildSet和roadSet
    const fullBuildingExpand = new Set<string>(buildingExpand.keys());
    const fullRoadExpand = new Set<string>(roadExpand.keys());
    const allRoadSet = new Set<string>(roadExpand.keys());

    // 为所有建筑确定位置，并将分配结果存入room.memory.construct.layout中，方便建筑建造函数调用结果。
    // 判断是否有中央布局的位置（四个构成斜正方形的building空位,会自动由内向外判断，尽量取离spawn最近的），如果没有则告知并提醒用户手动规划，有则转移给centerConstruction的memory.
    let center = "";
    let buildingExpandWithoutSpawn = buildingExpand;
    buildingExpandWithoutSpawn.delete(PosStr.setPosToStr(Game.spawns[room.memory.construct.firstSpawnName.name].pos)); // 避免把spawn作为中心布局点
    buildingExpandWithoutSpawn = PosStr.reverseSet(buildingExpandWithoutSpawn); // 一开始的集合元素遍历顺序是由外向内，这里把集合里的元素倒过来，变成由内向外。
    buildingExpandWithoutSpawn.forEach(posStr0 => {
        PosStr.getDiagPosStr(posStr0).forEach(posStr1 => {
            let i5 = 0;
            PosStr.getDiagPosStr(posStr1).forEach(posStr2 => {
                if (buildingExpandWithoutSpawn.has(posStr2)) {
                    i5++;
                }
            });
            if (i5 === 4) {
                center = posStr1;
            }
        });
    });
    PosStr.getDiagPosStr(center).forEach(posStr => {
        buildingExpand.delete(posStr); // 从原集合中去除这四个位置
        buildingExpandWithoutSpawn.delete(posStr); // 从原集合中去除这四个位置
    });

    // 判断powerSpawn,Nuker，ob,两个spawn的位置（尽量靠近storage）
    const obSet = new Set<string>();
    for (const posStr of buildingExpandWithoutSpawn) {
        obSet.add(posStr);
        buildingExpandWithoutSpawn.delete(posStr);
        buildingExpand.delete(posStr);
        break;
    }
    let buildingExpandPowerSpawn = buildingExpandWithoutSpawn;
    buildingExpandPowerSpawn = PosStr.reverseSet(buildingExpandPowerSpawn);
    const powerSpawnSet = new Set<string>();
    const nukerSet = new Set<string>();
    const spawnSet = new Set<string>();
    spawnSet.add(PosStr.setPosToStr(Game.spawns[room.memory.construct.firstSpawnName.name].pos));
    for (const posStr of buildingExpandPowerSpawn) {
        powerSpawnSet.add(posStr);
        buildingExpandPowerSpawn.delete(posStr);
        buildingExpand.delete(posStr);
        break;
    }
    for (const posStr of buildingExpandPowerSpawn) {
        nukerSet.add(posStr);
        buildingExpandPowerSpawn.delete(posStr);
        buildingExpand.delete(posStr);
        break;
    }
    let i3 = 0;
    for (const posStr of buildingExpandPowerSpawn) {
        i3++;
        spawnSet.add(posStr);
        buildingExpandPowerSpawn.delete(posStr);
        buildingExpand.delete(posStr);
        if (i3 > 1) {
            break;
        }
    }
    // 判断塔的位置（任意两个塔之间距离应大于等于3，并且尽量靠近storage）
    const buildingExpandWithoutSpawnAndCenter = buildingExpandPowerSpawn;
    const towerSet = new Set<string>();
    buildingExpandWithoutSpawnAndCenter.forEach(posStr => {
        let i2 = 0;
        towerSet.forEach(towerPosStr => {
            if (PosStr.getRangeToPosStr(posStr, towerPosStr) >= 3) {
                i2++;
            }
        });
        if (i2 === towerSet.size && towerSet.size <= 6) {
            towerSet.add(posStr);
            buildingExpand.delete(posStr); // 从原集合中去除这六个位置
            buildingExpandWithoutSpawnAndCenter.delete(posStr);
        }
    });

    // 判断lab的位置（斜着4x5，占12个building空位,20格road空位）
    const labLayoutTemplate = `
        🍱:一般建筑 🥖:路 🍘:Lab

        🍱🥖🍱🥖🍱🥖🍱🥖🍱
        🥖🍱🥖🍘🍘🍱🥖🍱🥖
        🍱🥖🍘🥖🍘🍘🍱🥖🍱
        🥖🍱🍘🍘🥖🍘🥖🍱🥖
        🍱🥖🍱🍘🍘🥖🍱🥖🍱
        🥖🍱🥖🍱🥖🍱🥖🍱🥖
        `;
    let buildingExpandWithoutAbove = buildingExpandWithoutSpawnAndCenter;
    buildingExpandWithoutAbove = PosStr.reverseSet(buildingExpandWithoutAbove);
    let m = 0;
    const labSet = new Set<string>();
    const square2Set = new Set<string>();
    const square3Set = new Set<string>();
    const coreLabPos: string[] = [];
    let ifRun = true;
    let cpu = Game.cpu.getUsed();
    buildingExpandWithoutAbove.forEach(posStr0 => {
        if (ifRun) {
            m++;
            let i1 = 0;
            PosStr.getDiagPosStr(posStr0).forEach(posStr1 => {
                PosStr.getDiagPosStr(posStr1).forEach(posStr2 => {
                    square2Set.add(posStr2);
                });
            });
            square2Set.forEach(posStr => {
                if (buildingExpandWithoutAbove.has(posStr)) {
                    i1++;
                }
            });
            if (i1 === 9) {
                PosStr.getQuadPosStr(posStr0).forEach(posStr1 => {
                    if (ifRun) {
                        let j = 0;
                        PosStr.getDiagPosStr(posStr1).forEach(posStr2 => {
                            PosStr.getDiagPosStr(posStr2).forEach(posStr3 => {
                                square3Set.add(posStr3);
                            });
                        });
                        square3Set.forEach(posStr => {
                            if (buildingExpandWithoutAbove.has(posStr)) {
                                j++;
                            }
                        });
                        if (j === 9) {
                            ifRun = false;
                            coreLabPos.push(posStr0, posStr1);
                        } else {
                            square3Set.clear();
                        }
                    }
                });
            } else {
                square2Set.clear();
            }
        }
    });
    cpu = Game.cpu.getUsed() - cpu;
    if (square2Set.size === 9 && square3Set.size === 9 && coreLabPos.length === 2) {
        // console.log(`在第${m}个位置检索后，找到了lab布局，消耗cpu为${cpu.toFixed(2)}`);
        const snakeLabPosSetList = PosStr.get2SnakePosStr(new Set(coreLabPos));
        snakeLabPosSetList[0].forEach(posStr => {
            labSet.add(posStr);
            buildingExpand.delete(posStr);
            roadExpand.delete(posStr);
            allRoadSet.delete(posStr);
        });
        snakeLabPosSetList[1].forEach(posStr => {
            buildingExpand.delete(posStr);
            roadExpand.add(posStr);
            allRoadSet.add(posStr);
        });
        coreLabPos.forEach(posStr => {
            buildingExpand.delete(posStr);
            roadExpand.add(posStr);
            allRoadSet.add(posStr);
        });
    } else {
        console.log("未找到lab布局");
    }

    // 寻找通往其他房间的路径（如果有的话）
    const directionList = [FIND_EXIT_TOP, FIND_EXIT_RIGHT, FIND_EXIT_BOTTOM, FIND_EXIT_LEFT];
    const outwardsRoadPosSet = new Set<string>();
    for (const direction of directionList) {
        const targetRoomPositionList = room.find(direction);
        const pos =
            Game.spawns[room.memory.construct.firstSpawnName.name].pos.findClosestByPath(targetRoomPositionList);
        if (pos) {
            const ret = PathFinder.search(Game.spawns[room.memory.construct.firstSpawnName.name].pos, pos, {
                // 我们需要把默认的移动成本设置的更高一点
                // 这样我们就可以在 roomCallback 里把道路移动成本设置的更低
                plainCost: 2,
                swampCost: 10,

                roomCallback(roomName) {
                    const roomSearch = Game.rooms[roomName];
                    // 在这个示例中，`room` 始终存在
                    // 但是由于 PathFinder 支持跨多房间检索
                    // 所以你要更加小心！
                    if (!roomSearch) return false;
                    const costs = new PathFinder.CostMatrix();

                    // 在这里遍历所有建筑，并将cost设置为最高
                    buildingExpand.forEach(posStr => {
                        const coord = PosStr.parseCoord(posStr);
                        costs.set(coord.x, coord.y, 0xff);
                    });
                    // 在这里遍历所有路，并将cost设置为1
                    roadExpand.forEach(posStr => {
                        const coord = PosStr.parseCoord(posStr);
                        costs.set(coord.x, coord.y, 1);
                    });

                    return costs;
                }
            });
            ret.path.forEach(pos1 => {
                outwardsRoadPosSet.add(PosStr.setPosToStr(pos1));
            });
        }
    }
    // 寻找source,controller,minerals的路径，同时确定link和container的位置，使用path.finder进行寻找。
    // 这里不需要处理多种道路重叠的情况。

    const sourceAndControllerRoadPosSet = new Set<string>(); // 寻找source,controller的路径
    let sourceAndControllerContainerPosSet = new Set<string>();
    let sourceAndControllerLinkPosSet = new Set<string>();
    const sourceContainerPosSet = new Set<string>();
    const controllerContainerPosSet = new Set<string>();
    const sourceLinkPosSet = new Set<string>();
    const controllerLinkPosSet = new Set<string>();
    const goals = _.map(
        (room.find(FIND_SOURCES) as { pos: RoomPosition; structureType?: string }[]).concat(
            room.controller as StructureController
        ),
        function (source) {
            // 我们没办法走到 source 上 -- 将 `range` 设置为 1
            // 所以我们将寻路至其旁边,这里应该寻路到对应的container上
            if (typeof source.structureType === "undefined") {
                return { pos: source.pos, range: 1, name: "source" };
            } else {
                return { pos: source.pos, range: 3, name: "controller" };
            }
        }
    );

    for (const goal of goals) {
        const ret = PathFinder.search(Game.spawns[room.memory.construct.firstSpawnName.name].pos, goal, {
            // 我们需要把默认的移动成本设置的更高一点
            // 这样我们就可以在 roomCallback 里把道路移动成本设置的更低
            plainCost: 2,
            swampCost: 10,

            roomCallback(roomName) {
                const roomSearch = Game.rooms[roomName];
                // 在这个示例中，`room` 始终存在
                // 但是由于 PathFinder 支持跨多房间检索
                // 所以你要更加小心！
                if (!roomSearch) return false;
                const costs = new PathFinder.CostMatrix();

                // 在这里遍历所有建筑，并将cost设置为最高
                buildingExpand.forEach(posStr => {
                    const coord = PosStr.parseCoord(posStr);
                    costs.set(coord.x, coord.y, 0xff);
                });
                // 在这里遍历所有路，并将cost设置为1
                allRoadSet.forEach(posStr => {
                    const coord = PosStr.parseCoord(posStr);
                    costs.set(coord.x, coord.y, 1);
                });

                return costs;
            }
        });

        if (ret.path.length > 0) {
            if (goal.name === "source") {
                const pos = ret.path.pop() as RoomPosition;
                ret.path.forEach(pos1 => {
                    const pos1Str = PosStr.setPosToStr(pos1);
                    sourceAndControllerRoadPosSet.add(pos1Str);
                    allRoadSet.add(pos1Str);
                });
                sourceContainerPosSet.add(PosStr.setPosToStr(pos));
                const posAround = PosStr.getSquarePosStr(PosStr.setPosToStr(pos));
                for (const posAroundPos of posAround) {
                    const terrain: Terrain[] = PosStr.getPosFromStr(posAroundPos).lookFor(LOOK_TERRAIN);
                    if (terrain[0] !== "wall" && !isPosSetInPos(sourceAndControllerRoadPosSet, posAroundPos)) {
                        sourceLinkPosSet.add(posAroundPos);
                        break;
                    }
                }
            } else if (goal.name === "controller") {
                const pos = ret.path.pop() as RoomPosition;
                ret.path.forEach(pos1 => {
                    const pos1Str = PosStr.setPosToStr(pos1);
                    sourceAndControllerRoadPosSet.add(pos1Str);
                    allRoadSet.add(pos1Str);
                });
                controllerContainerPosSet.add(PosStr.setPosToStr(pos));
                const posAround = PosStr.getSquarePosStr(PosStr.setPosToStr(pos));
                for (const posAroundPos of posAround) {
                    const terrain: Terrain[] = PosStr.getPosFromStr(posAroundPos).lookFor(LOOK_TERRAIN);
                    if (terrain[0] !== "wall" && !isPosSetInPos(sourceAndControllerRoadPosSet, posAroundPos)) {
                        controllerLinkPosSet.add(posAroundPos);
                        break;
                    }
                }
            }
        }
    }

    sourceAndControllerRoadPosSet.forEach(posStr => {
        roadExpand.delete(posStr);
    });
    sourceAndControllerContainerPosSet = PosStr.mergeSet(controllerContainerPosSet, sourceContainerPosSet);
    sourceAndControllerLinkPosSet = PosStr.mergeSet(controllerLinkPosSet, sourceLinkPosSet);

    const aroundSpawnRoadPosSet = PosStr.getDiagPosStr(room.memory.construct.firstSpawnName.pos);

    // 寻找mineral路径
    const mineralRoadPosSet = new Set<string>(); // 寻找source,controller的路径
    const mineralContainerPosSet = new Set<string>();
    const mineralGoals = _.map(
        room.find(FIND_MINERALS) as { pos: RoomPosition; structureType?: string }[],
        function (source) {
            // 我们没办法走到 source 上 -- 将 `range` 设置为 1
            // 所以我们将寻路至其旁边,这里应该寻路到对应的container上
            return { pos: source.pos, range: 1 };
        }
    );

    for (const mineralGoal of mineralGoals) {
        const ret = PathFinder.search(Game.spawns[room.memory.construct.firstSpawnName.name].pos, mineralGoal, {
            // 我们需要把默认的移动成本设置的更高一点
            // 这样我们就可以在 roomCallback 里把道路移动成本设置的更低
            plainCost: 2,
            swampCost: 10,

            roomCallback(roomName) {
                const roomSearch = Game.rooms[roomName];
                // 在这个示例中，`room` 始终存在
                // 但是由于 PathFinder 支持跨多房间检索
                // 所以你要更加小心！
                if (!roomSearch) return false;
                const costs = new PathFinder.CostMatrix();

                // 在这里遍历所有建筑，并将cost设置为最高
                buildingExpand.forEach(posStr => {
                    const coord = PosStr.parseCoord(posStr);
                    costs.set(coord.x, coord.y, 0xff);
                });
                // 在这里遍历所有路，并将cost设置为1
                allRoadSet.forEach(posStr => {
                    const coord = PosStr.parseCoord(posStr);
                    costs.set(coord.x, coord.y, 1);
                });

                return costs;
            }
        });
        if (ret.path.length > 0) {
            mineralContainerPosSet.add(PosStr.setPosToStr(ret.path.pop() as RoomPosition));
            mineralContainerPosSet.forEach(posStr => {
                if (roadExpand.has(posStr)) {
                    roadExpand.delete(posStr);
                }
            });
        }
        ret.path.forEach(pos => {
            mineralRoadPosSet.add(PosStr.setPosToStr(pos));
            allRoadSet.add(PosStr.setPosToStr(pos));
        });
        mineralRoadPosSet.forEach(posStr => {
            if (roadExpand.has(posStr)) {
                roadExpand.delete(posStr);
            }
        });
    }

    // freeSpacePosSet
    const freeSpacePosSet = new Set<string>();
    buildingExpand.forEach(posStr => {
        if (freeSpacePosSet.size < 8) {
            buildingExpand.delete(posStr);
            freeSpacePosSet.add(posStr);
        }
    });
    if (freeSpacePosSet.size < 60) {
        console.log("freeSpace位置不足，现在数量为" + freeSpacePosSet.size.toString());
    }
    // sourceContainerPosSet
    const wallAndRampartPosSet = getMinCut(
        true,
        fullBuildingExpand,
        SetTools.mergeSet(SetTools.mergeSet(sourceContainerPosSet, mineralContainerPosSet), sourceLinkPosSet),
        room
    );
    const wallPosSet = new Set<string>();
    const rampartPosSet = new Set<string>();

    let anyRoadSet = new Set<string>(); // anyRoadSet只用作显示。
    const anyRoadSetList = [roadExpand, sourceAndControllerRoadPosSet, mineralRoadPosSet, outwardsRoadPosSet];
    for (const set of anyRoadSetList) {
        anyRoadSet = PosStr.mergeSet(anyRoadSet, set);
    }
    const rampartAroundController = PosStr.getSquarePosStr(PosStr.setPosToStr(room.controller?.pos as RoomPosition));
    wallAndRampartPosSet.forEach(posStr => {
        if (anyRoadSet.has(posStr) || rampartAroundController.has(posStr)) {
            // 判断是否有路在pos下或pos在controller旁边
            rampartPosSet.add(posStr);
            anyRoadSet.delete(posStr);
        } else {
            wallPosSet.add(posStr);
        }
    });

    // 分配extension位置
    const extensionPosSet = new Set<string>();
    buildingExpand.forEach(posStr => {
        if (extensionPosSet.size < 60) {
            extensionPosSet.add(posStr);
        }
    });
    if (extensionPosSet.size < 60) {
        console.log("extension位置不足，现在数量为" + extensionPosSet.size.toString());
    }

    // 初始化memory
    room.memory.construct.centerPos = center;
    room.memory.construct.firstSpawnName = {
        name: room.memory.construct.firstSpawnName.name,
        pos: PosStr.setPosToStr(Game.spawns[room.memory.construct.firstSpawnName.name].pos)
    };
    room.memory.construct.freeSpacePosList = Array.from(freeSpacePosSet.keys());
    room.memory.construct.layout = {
        road: {
            baseRoad: { posStrList: Array.from(fullRoadExpand.keys()), levelToBuild: 8 },
            sourceAndControllerRoad: {
                posStrList: Array.from(sourceAndControllerRoadPosSet.keys()),
                levelToBuild: 2
            },
            mineralRoad: {
                posStrList: Array.from(mineralRoadPosSet.keys()),
                levelToBuild: 7
            },
            aroundSpawnRoad: {
                posStrList: Array.from(aroundSpawnRoadPosSet.keys()),
                levelToBuild: 2
            }
        },
        extension: {
            extension: {
                posStrList: Array.from(extensionPosSet.keys()),
                levelToBuild: 1
            }
        },
        tower: {
            tower: {
                posStrList: Array.from(towerSet.keys())
            }
        },
        container: {
            sourceContainer: {
                posStrList: Array.from(sourceContainerPosSet.keys()),
                levelToBuild: 1
            },
            controllerContainer: {
                posStrList: Array.from(controllerContainerPosSet.keys()),
                levelToBuild: 1
            },
            mineralContainer: {
                posStrList: Array.from(mineralContainerPosSet.keys()),
                levelToBuild: 7
            }
        },
        link: {
            sourceLink: {
                posStrList: Array.from(sourceLinkPosSet.keys()),
                levelToBuild: 6
            },
            controllerLink: {
                posStrList: Array.from(controllerLinkPosSet.keys()),
                levelToBuild: 5
            },
            centerLink: {
                posStrList: [Array.from(PosStr.getDiagPosStr(center).keys())[0]],
                levelToBuild: 5
            }
        },
        constructedWall: {
            constructedWall: {
                posStrList: Array.from(wallPosSet.keys()),
                levelToBuild: 5
            }
        },
        rampart: {
            rampart: {
                posStrList: Array.from(rampartPosSet.keys()),
                levelToBuild: 5
            }
        },
        spawn: {
            spawn: {
                posStrList: Array.from(spawnSet.keys())
            }
        },
        storage: {
            storage: {
                posStrList: [Array.from(PosStr.getDiagPosStr(center).keys())[1]]
            }
        },
        terminal: {
            terminal: {
                posStrList: [Array.from(PosStr.getDiagPosStr(center).keys())[2]]
            }
        },
        factory: {
            factory: {
                posStrList: [Array.from(PosStr.getDiagPosStr(center).keys())[3]]
            }
        },
        lab: {
            lab: {
                posStrList: Array.from(labSet.keys())
            }
        },
        powerSpawn: {
            powerSpawn: {
                posStrList: Array.from(powerSpawnSet.keys())
            }
        },
        observer: {
            observer: {
                posStrList: Array.from(obSet.keys())
            }
        },
        nuker: {
            nuker: {
                posStrList: Array.from(nukerSet.keys())
            }
        },
        extractor: {
            extractor: {
                posStrList: [PosStr.setPosToStr(room.find(FIND_MINERALS)[0].pos)]
            }
        }
    };
    // 运行渲染函数。用数字搭配不同的颜色表示建筑，运行(keepTime)tick并把缓存挂在global上，告知用户自行查看。
    const layout: map<"Text">[] = [];
    const setList = [
        extensionPosSet,
        anyRoadSet,
        PosStr.getDiagPosStr(center),
        towerSet,
        labSet,
        powerSpawnSet,
        nukerSet,
        spawnSet,
        obSet,
        sourceAndControllerContainerPosSet,
        mineralContainerPosSet,
        sourceAndControllerLinkPosSet,
        wallPosSet,
        rampartPosSet
    ]; // 集合
    const text = ["房", "路", "中", "塔", "瓶", "力", "弹", "出", "观", "容", "容", "节", "墙", "城"]; // 显示文字
    const color = [
        "#00FFFF",
        "#CCCCCC",
        "#FF6347",
        "#FF9900",
        "#3399CC",
        "#FF6666",
        "#FF9900",
        "#FF6347",
        "#FF6347",
        "#CCCCCC",
        "#3399CC",
        "#FF6347",
        "#0066CC",
        "#99CC33"
    ]; // 文字颜色

    for (let i = 0, j = setList.length; i < j; i++) {
        pushLayout(setList[i], i, layout, xUp, text, color);
    }
    const GUI = GUIfun();
    const visual0 = GUI.draw(new RoomVisual(room.name), layout);
    newAcrossTickTask(
        {
            taskName: "gridLayout.showLayout", // 任务名称
            args: [visual0.export(), room.name, keepTime], // 传递的参数，要能够放在memory的类型
            executeTick: Game.time + 1, // 执行时间
            intervalTick: 1, // 执行间隔,
            log: true
        },
        task => {
            // console.log(
            //     `${Game.time} Running TickTask: ${task.taskName},args:${JSON.stringify(task.args)} created in ${
            //         task.taskCreateTick as number
            //     } succeed`
            // );
            const [visualExportsArg, roomNameArg, durationArg] = task.args as string[];
            if ((task.taskCreateTick as number) + Number(durationArg) >= Game.time) {
                const roomVisual = new RoomVisual(roomNameArg);
                roomVisual.import(visualExportsArg);
                return "runAgain";
            } else {
                return "finish";
            }
        }
    );

    const endCpu = Game.cpu.getUsed();
    // console.log(`耗费cpu:${(endCpu - startCpu).toFixed(2)}`);
}

function isPosSetInPos(posSet: Set<string>, pos: string): boolean {
    for (const posSetPosStr of posSet) {
        if (posSetPosStr === pos) {
            return true;
        }
    }
    return false;
}

interface Coord {
    x: number;
    y: number;
}

function coordToRoomPositionStr(coordList: Coord[], room: Room): string[] {
    const roomPositionStrList = [];
    for (const coord of coordList) {
        roomPositionStrList.push(PosStr.genePosStr(coord.x, coord.y, room.name));
    }
    return roomPositionStrList;
}

function pushLayout(
    exp: Set<string>,
    i: number,
    layout: map<"Text">[] = [],
    x: number,
    text: string[],
    color: string[]
): void {
    exp.forEach(posStr => {
        const coord = PosStr.parseCoord(posStr);
        layout.push({
            type: "Text",
            layout: {
                x: coord.x + x,
                y: coord.y,
                content: text[i],
                color: color[i]
            }
        });
    });
}

// 生成rampart和wall的摆放位置（使用overMind的minCut）
function getMinCut(
    preferCloserBarriers = true,
    fullBuildingExpand: Set<string>,
    containerAndLinkSet: Set<string>,
    room: Room
): Set<string> {
    const colony = room;
    const colonyName = room.name;
    let cpu = Game.cpu.getUsed();
    // Rectangle Array, the Rectangles will be protected by the returned tiles
    const rectArray = [];
    const padding = 3;
    for (const building of fullBuildingExpand) {
        if (building) {
            const { x, y } = PosStr.parseCoord(building);
            const [x1, y1] = [Math.max(x - padding, 0), Math.max(y - padding, 0)];
            const [x2, y2] = [Math.min(x + padding, 49), Math.min(y + padding, 49)];
            rectArray.push({ x1, y1, x2, y2 });
        }
    }
    // const containerAndLinkSetPadding = 1;
    // for (const building of containerAndLinkSet) {
    //     if (building) {
    //         const { x, y } = PosStr.parseCoord(building);
    //         const [x1, y1] = [Math.max(x - containerAndLinkSetPadding, 0), Math.max(y - containerAndLinkSetPadding, 0)];
    //         const [x2, y2] = [
    //             Math.min(x + containerAndLinkSetPadding, 49),
    //             Math.min(y + containerAndLinkSetPadding, 49)
    //         ];
    //         rectArray.push({ x1, y1, x2, y2 });
    //     }
    // }
    let controllerPadding = 1;
    if (colony.controller) {
        const { x, y } = colony.controller.pos;
        if (
            x < 0 + controllerPadding ||
            x > 49 - controllerPadding ||
            y < 0 + controllerPadding ||
            y > 49 - controllerPadding
        ) {
            controllerPadding = 1;
            const [x1, y1] = [Math.max(x - controllerPadding, 4), Math.max(y - controllerPadding, 4)];
            const [x2, y2] = [Math.min(x + controllerPadding, 45), Math.min(y + controllerPadding, 45)];
            rectArray.push({ x1, y1, x2, y2 });
            console.log(`bad controller pos, too close to border,choose controllerPadding = ${controllerPadding}`);
        } else {
            const [x1, y1] = [Math.max(x - controllerPadding, 4), Math.max(y - controllerPadding, 4)];
            const [x2, y2] = [Math.min(x + controllerPadding, 45), Math.min(y + controllerPadding, 45)];
            rectArray.push({ x1, y1, x2, y2 });
            console.log(`choose controllerPadding = ${controllerPadding}`);
        }
    }

    // Get Min cut
    // Positions is an array where to build walls/ramparts
    const positions = getCutTiles(colonyName, rectArray, preferCloserBarriers, 2);
    // Test output
    // console.log('Positions returned', positions.length);
    cpu = Game.cpu.getUsed() - cpu;
    // console.log('Needed', cpu, ' cpu time');
    // console.log(`生成rampart和wall位置个数：${positions.length};` + `该子任务消耗cpu: ${cpu.toFixed(2)}`);
    return new Set(coordToRoomPositionStr(positions, room));
}
