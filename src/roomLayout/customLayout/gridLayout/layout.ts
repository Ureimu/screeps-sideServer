import { writeFileSync } from "fs";
import { Range } from "utils/common/type";
import { Coord } from "utils/Grid/type";
import { getMinCut } from "utils/mincut/minCut";
import { GridMap } from "utils/RoomGridMap";
import { RoomGridPosition } from "utils/RoomGridMap/type";
import { SvgCode } from "utils/SvgCode";
import { findSpace } from "./findSpace";

const freePosNum = 8;
const visualSet = (map: GridMap, set: Set<string>) =>
    map.visualizeDataList.push(new SvgCode(map.mapSize).circle(Array.from(set).map(map.prasePosStr)));
const filterMapPos = (map: GridMap) => {
    return (xStack: RoomGridPosition[]) => {
        return xStack.map((firstSpawnPosGrid): LayoutFilterData => {
            const { x, y } = firstSpawnPosGrid;
            if (firstSpawnPosGrid.cost === map.MAX_COST || !map.isNotCloseToWalkableBorder([firstSpawnPosGrid], 5)) {
                return { x, y, isGood: false, cost: 0, rampartNum: 0, reason: "unable to put spawn" };
            } else {
                const aMap = new GridMap(map.terrainData, map.objects, map.roomName, map.name);
                const filterData = gridBasedFirstSpawn(aMap, firstSpawnPosGrid);
                if (filterData.existLayout) {
                    return {
                        x,
                        y,
                        isGood: true,
                        cost: filterData.cost,
                        rampartNum: filterData.rampartNum,
                        reason: "success"
                    };
                } else {
                    return {
                        x,
                        y,
                        isGood: false,
                        cost: filterData.cost,
                        rampartNum: filterData.rampartNum,
                        reason: filterData.reason
                    };
                }
            }
        });
    };
};

export function gridLayout(map: GridMap): boolean {
    const result = map.grid.map(filterMapPos(map)).flat(1);
    const goodResult = result.filter(({ isGood }) => isGood);
    const length = goodResult.length;
    if (length > 0) {
        goodResult.sort((a, b) => a.cost - b.cost);
        console.log(`get layout ${map.roomName}`);
        // console.log(goodResult.slice(0, 3));
        gridBasedFirstSpawn(map, goodResult[0], true);
        writeFileSync(`out/${map.name}L.json`, JSON.stringify(result, null, 4));
        return true;
    } else {
        const data = result.sort((a, b) => -(a.cost - b.cost));
        writeFileSync(`out/${map.name}L.json`, JSON.stringify(data, null, 4));
        console.log(`cannot get layout ${map.roomName}`);
        // console.log(result.flat(1).slice(0, 5));
        return false;
    }
}

function gridBasedFirstSpawn(map: GridMap, firstSpawnPos: Coord, doLayout = false): LayoutAccessData {
    const accessData: LayoutAccessData = { existLayout: false, cost: 0, rampartNum: 0, reason: "unknown" };

    // console.log("add");
    map.addStructure("spawn", 1, 10, firstSpawnPos);
    // console.log(map.mod2notEqualPos(firstSpawnPos, 1).map(map.posStr));
    // const svg = new SvgCode(map.mapSize).circle(firstSpawnPos);
    // map.mod2notEqualPos(firstSpawnPos, 1).forEach((pos, index) => {
    //     svg.text(`${index}`, pos, { fill: "yellow" });
    // });
    // map.visualizeDataList.push(svg);

    map.posStr(firstSpawnPos);
    const foundData = findSpace(map, firstSpawnPos, 130 + freePosNum);
    let { buildingExpand } = foundData;
    const { roadExpand, isExist } = foundData;
    if (!isExist) {
        accessData.reason = `cannot find enough space, spaceNum:${buildingExpand.size}`;
        return accessData;
    }
    roadExpand.forEach(posStr => {
        const pos = map.prasePosStr(posStr);
        if (map.gridPos(pos).terrain === "plain") accessData.cost += 5e3;
        if (map.gridPos(pos).terrain === "swamp") accessData.cost += 25e3;
    });
    const fullBuildingExpand = new Set<string>(buildingExpand.keys());
    const fullRoadExpand = new Set<string>(roadExpand.keys());
    const allRoadSet = new Set<string>(roadExpand.keys());
    const preSetBuilding = new Set<string>();

    // 为所有建筑确定位置，并将分配结果存入room.memory.construct.layout中，方便建筑建造函数调用结果。
    // 判断是否有中央布局的位置（四个构成斜正方形的building空位,会自动由内向外判断，尽量取离spawn最近的），如果没有则告知并提醒用户手动规划，有则转移给centerConstruction的memory.
    let center = "";

    buildingExpand.delete(map.posStr(firstSpawnPos)); // 避免把spawn作为中心布局点
    preSetBuilding.add(map.posStr(firstSpawnPos));
    // buildingExpandWithoutSpawn = new Set<string>(Array.from(buildingExpandWithoutSpawn).reverse()); // 一开始的集合元素遍历顺序是由外向内，这里把集合里的元素倒过来，变成由内向外。
    Array.from(buildingExpand).some(posStr0 => {
        const pos0 = map.prasePosStr(posStr0);
        return map.mod2notEqualPos(pos0, 1).some(pos1 => {
            // console.log(pos1, map.mod2notEqualPos(pos1, 1));
            let i5 = 0;
            map.mod2notEqualPos(pos1, 1).every(pos2 => {
                if (buildingExpand.has(map.posStr(pos2))) {
                    // console.log(i5);
                    // 保证核心区周围有一圈路免得卡creep
                    if (
                        map
                            .mod2notEqualPos(pos2, 1, { ignoreWall: true })
                            .every(pos3 => roadExpand.has(map.posStr(pos3)))
                    ) {
                        i5++;
                        // map.visualizeDataList.push(new SvgCode(map.mapSize).circle(map.mod2notEqualPos(pos2, 1)));
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    return false;
                }
            });
            if (i5 === 4) {
                center = map.posStr(pos1);
                map.centerPos = pos1;
                return true;
            }
            return false;
        });
    });

    if (center === "") {
        accessData.reason = "cannot find center";
        return accessData;
    }
    // console.log("exist");
    const center4Pos = map.mod2notEqualPos(map.prasePosStr(center), 1);
    center4Pos.forEach(pos => {
        const posStr = map.posStr(pos);
        buildingExpand.delete(posStr); // 从原集合中去除这四个位置
        preSetBuilding.add(posStr);
    });

    const [centerLinkPos, factoryPos, terminalPos, storagePos] = center4Pos;
    map.addStructure("centerLink", 5, 10, centerLinkPos);
    map.addStructure("factory", 7, 10, factoryPos);
    map.addStructure("terminal", 6, 10, terminalPos);
    map.addStructure("storage", 4, 10, storagePos);

    // 判断powerSpawn,Nuker，ob,两个spawn的位置（尽量靠近storage）
    const obSet = new Set<string>();
    for (const posStr of buildingExpand) {
        obSet.add(posStr);
        buildingExpand.delete(posStr);
        preSetBuilding.add(posStr);
        break;
    }

    const [obPosStr] = obSet;
    map.addStructure("observer", 8, 10, map.prasePosStr(obPosStr));

    // buildingExpandPowerSpawn = new Set<string>(Array.from(buildingExpandPowerSpawn).reverse());
    const powerSpawnSet = new Set<string>();
    const nukerSet = new Set<string>();
    const spawnSet = new Set<string>();
    spawnSet.add(map.posStr(firstSpawnPos));
    for (const posStr of buildingExpand) {
        powerSpawnSet.add(posStr);
        buildingExpand.delete(posStr);
        preSetBuilding.add(posStr);
        break;
    }
    for (const posStr of buildingExpand) {
        nukerSet.add(posStr);
        buildingExpand.delete(posStr);
        preSetBuilding.add(posStr);
        break;
    }
    let i3 = 0;
    for (const posStr of buildingExpand) {
        i3++;
        spawnSet.add(posStr);
        buildingExpand.delete(posStr);
        preSetBuilding.add(posStr);
        if (i3 > 1) {
            break;
        }
    }

    const [psPosStr] = powerSpawnSet;
    map.addStructure("powerSpawn", 8, 10, map.prasePosStr(psPosStr));
    const [nukerPosStr] = nukerSet;
    map.addStructure("nuker", 8, 10, map.prasePosStr(nukerPosStr));
    const [level1Spawn, level7Spawn, level8Spawn] = spawnSet;
    map.addStructure("spawn", 7, 10, map.prasePosStr(level7Spawn));
    map.addStructure("spawn", 8, 10, map.prasePosStr(level8Spawn));

    // lab
    let m = 0;
    const labSet = new Set<string>();
    const square2Set = new Set<string>();
    const square3Set = new Set<string>();
    let coreLabPos: Coord[] = [];
    let ifRun = true;
    buildingExpand.forEach(posStr0 => {
        if (ifRun) {
            m++;
            let i1 = 0;
            map.mod2notEqualPos(map.prasePosStr(posStr0), 1).forEach(pos1 => {
                map.mod2notEqualPos(pos1, 1).forEach(pos2 => {
                    square2Set.add(map.posStr(pos2));
                });
            });
            square2Set.forEach(posStr => {
                if (buildingExpand.has(posStr)) {
                    i1++;
                }
            });
            if (i1 === 9) {
                const pos0 = map.prasePosStr(posStr0);
                map.mod2equalPos(pos0, 1).forEach(pos1 => {
                    if (ifRun) {
                        let j = 0;
                        map.mod2notEqualPos(pos1, 1).forEach(pos2 => {
                            map.mod2notEqualPos(pos2, 1).forEach(pos3 => {
                                square3Set.add(map.posStr(pos3));
                            });
                        });
                        square3Set.forEach(posStr => {
                            if (buildingExpand.has(posStr)) {
                                j++;
                            }
                        });
                        if (j === 9) {
                            ifRun = false;
                            coreLabPos.push(pos0, pos1);
                            coreLabPos = _.uniq(coreLabPos, false, map.posStr);
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
    const labRoadSet = new Set<string>();
    if (square2Set.size === 9 && square3Set.size === 9 && coreLabPos.length === 2) {
        // console.log(`在第${m}个位置检索后，找到了lab布局，消耗cpu为${cpu.toFixed(2)}`);
        const snakeLabPosSetList = map.SnakeSidePos(coreLabPos);
        snakeLabPosSetList[0].forEach(pos => {
            const posStr = map.posStr(pos);
            labSet.add(posStr);
            // preSetBuilding.add(posStr);
            buildingExpand.delete(posStr);
            roadExpand.delete(posStr);
            allRoadSet.delete(posStr);
            fullBuildingExpand.add(posStr);
        });
        snakeLabPosSetList[1].forEach(pos => {
            const posStr = map.posStr(pos);
            buildingExpand.delete(posStr);
            roadExpand.add(posStr);
            allRoadSet.add(posStr);
            labRoadSet.add(posStr);
            fullBuildingExpand.delete(posStr);
        });
        coreLabPos.forEach(pos => {
            const posStr = map.posStr(pos);
            buildingExpand.delete(posStr);
            roadExpand.add(posStr);
            allRoadSet.add(posStr);
            labRoadSet.add(posStr);
            fullBuildingExpand.delete(posStr);
        });
    } else {
        // 没有lab布局
        accessData.reason = "cannot find lab pos";
        return accessData;
    }
    map.addStructureByFillingLevel("lab", () => 0, Array.from(labSet).map(map.prasePosStr));

    // 把周围有路的斜正方形ex中间的路换成建筑位
    const diagExWithRoadSet = new Set<string>();
    const diagExWithRoadList: string[] = [];
    buildingExpand.forEach(posStr => {
        const pos = map.prasePosStr(posStr);
        const diagPosF1 = map.diagSquarePos(pos, 1);
        if (diagPosF1.length < 4) return;
        diagPosF1.some(centerExPos => {
            const diagPos1 = map.hollowDiagSquarePos(centerExPos, 1);
            if (diagPos1.length < 4) return false;
            else {
                if (diagPos1.every(exPos => buildingExpand.has(map.posStr(exPos)))) {
                    const diagPos2 = map.hollowDiagSquarePos(centerExPos, 2);
                    if (diagPos2.length < 8) return false;
                    else if (diagPos2.every(roadPos => roadExpand.has(map.posStr(roadPos)))) {
                        diagPos1.map(map.posStr).forEach(posStrHere => diagExWithRoadSet.add(posStrHere));
                        const centerExPosStr = map.posStr(centerExPos);
                        diagExWithRoadSet.add(centerExPosStr);
                        diagExWithRoadList.push(centerExPosStr);
                        roadExpand.delete(centerExPosStr);
                        allRoadSet.delete(centerExPosStr);
                        fullBuildingExpand.add(posStr);
                        return true;
                    }
                    return false;
                } else {
                    return false;
                }
            }
        });
    });
    const originList = Array.from(buildingExpand).reverse();
    buildingExpand = new Set<string>(diagExWithRoadList.concat(Array.from(buildingExpand).reverse()));
    // 去掉多余的building位置以及旁边的路
    // console.log(buildingExpand.size);
    originList.forEach(posStr => {
        if (fullBuildingExpand.size > 60 + 6 + freePosNum + 1) {
            if (!diagExWithRoadSet.has(posStr)) {
                fullBuildingExpand.delete(posStr);
                buildingExpand.delete(posStr);
            }
        }
    });
    // visualSet(map, roadExpand);
    roadExpand.forEach(posStr => {
        const pos = map.prasePosStr(posStr);
        if (
            !map.diagSquarePos(pos, 1).some(posHere => fullBuildingExpand.has(map.posStr(posHere))) &&
            !labRoadSet.has(posStr)
        ) {
            roadExpand.delete(posStr);
        }
    });
    // visualSet(map, fullBuildingExpand);
    // map.visualizeDataList.push(new SvgCode(map.mapSize).circle(Array.from(preSetBuilding).map(map.prasePosStr)));
    preSetBuilding.forEach(posStr => {
        map.diagSquarePos(map.prasePosStr(posStr), 1).forEach(pos => roadExpand.add(map.posStr(pos)));
    });
    // 判断塔的位置（任意两个塔之间距离应大于等于3，并且尽量靠近storage）
    const towerSet = new Set<string>();
    buildingExpand.forEach(posStr => {
        let i2 = 0;
        towerSet.forEach(towerPosStr => {
            if (map.getDistance(map.prasePosStr(posStr), map.prasePosStr(towerPosStr)) >= 3) {
                i2++;
            }
        });
        if (i2 === towerSet.size && towerSet.size <= 6) {
            towerSet.add(posStr);
            buildingExpand.delete(posStr); // 从原集合中去除这六个位置
        }
    });
    map.addStructureByFillingLevel("tower", () => 0, Array.from(towerSet).map(map.prasePosStr));

    // 分配extension位置
    const extensionPosSet = new Set<string>();
    buildingExpand.forEach(posStr => {
        if (extensionPosSet.size < 60) {
            buildingExpand.delete(posStr);
            extensionPosSet.add(posStr);
        }
    });
    if (extensionPosSet.size < 60) {
        // console.log("extension位置不足，现在数量为" + extensionPosSet.size.toString());
        accessData.reason = `extension pos not enough,num:${extensionPosSet.size}`;
        return accessData;
    }

    map.addStructureByFillingLevel(
        "extension",
        (level, index) => level * 20 + index,
        Array.from(extensionPosSet).map(map.prasePosStr)
    );

    // 分配freeSpace
    const freeSpacePosSet = new Set<string>();
    buildingExpand.forEach(posStr => {
        if (freeSpacePosSet.size < freePosNum) {
            buildingExpand.delete(posStr);
            freeSpacePosSet.add(posStr);
        }
    });
    if (freeSpacePosSet.size < freePosNum) {
        accessData.reason = `freeSpacePos not enough,num:${freeSpacePosSet.size}`;
        return accessData;
    }
    map.freeSpacePosList = Array.from(freeSpacePosSet);
    visualSet(map, freeSpacePosSet);
    // console.log(roadPos.length);
    map.addStructure("baseRoad", 0, 0, ...Array.from(roadExpand).map(map.prasePosStr));
    // Array.from(roadExpand)
    //     .map(map.prasePosStr)
    //     .forEach((pos, index) => {
    //         map.visualizeDataList.push(new SvgCode(map.mapSize).text(`${index}`, pos));
    //     });

    // 放各种路，container，link
    const centerPos = map.centerPos;
    if (!centerPos) {
        accessData.reason = "no center";
        return accessData;
    }
    const sources = map.findObjects("source");
    let hasPutLinkAtLevel6 = false;
    if (
        !sources.every(source => {
            const result = map.findPath(centerPos, source, 1);
            if (result.isFinish) {
                const containerPos = result.path.pop();
                if (!containerPos) return false;
                map.addStructure("sourceAndControllerRoad", 0, 0, ...result.path);
                map.addStructure("sourceContainer", 0, 0, containerPos);
                const linkPos = map.squarePos(containerPos, 1).filter(pos => {
                    const posHere = map.gridPos(pos);
                    if (posHere.layout.length === 0 && posHere.terrain !== "wall") return true;
                    else return false;
                })[0];
                if (!linkPos) return false;
                if (!hasPutLinkAtLevel6) {
                    map.addStructure("sourceLink", 6, 8, linkPos);
                    hasPutLinkAtLevel6 = true;
                } else {
                    map.addStructure("sourceLink", 7, 8, linkPos);
                }

                map.setCost(containerPos, map.MAX_COST / 2);
            } else {
                accessData.reason = "no source road";
                return accessData;
            }
            return true;
        })
    ) {
        accessData.reason = "no source container or link pos";
        return accessData;
    }
    const controller = map.findObjects("controller")[0];
    const controllerRoadResult = map.findPath(centerPos, controller, 3);
    if (controllerRoadResult.isFinish) {
        const containerPos = controllerRoadResult.path.pop();
        if (!containerPos) {
            accessData.reason = "no controller container pos";
            return accessData;
        }
        map.addStructure("sourceAndControllerRoad", 0, 0, ...controllerRoadResult.path);
        map.addStructure("controllerContainer", 0, 0, containerPos);
        const linkPos = map.squarePos(containerPos, 1).filter(pos => {
            const posHere = map.gridPos(pos);
            if (posHere.layout.length === 0 && posHere.terrain !== "wall") return true;
            else return false;
        })[0];
        if (!linkPos) {
            accessData.reason = "no controller link pos";
            return accessData;
        }
        map.addStructure("controllerLink", 5, 10, linkPos);
        map.setCost(containerPos, map.MAX_COST / 2);
    } else {
        accessData.reason = "no controller road";
        return accessData;
    }
    const mineral = map.findObjects("mineral")[0];
    map.addStructure("extractor", 7, 1, mineral);
    const mineralRoadResult = map.findPath(centerPos, mineral, 1);
    if (mineralRoadResult.isFinish) {
        const containerPos = mineralRoadResult.path.pop();
        if (!containerPos) {
            accessData.reason = "no mineral container pos";
            return accessData;
        }
        map.addStructure("mineralRoad", 0, 0, ...mineralRoadResult.path);
        map.addStructure("mineralContainer", 0, 0, containerPos);
        map.setCost(containerPos, map.MAX_COST / 2);
    } else {
        accessData.reason = "no mineral road";
        return accessData;
    }

    const rampartPos = getMinCut(map, false);
    // console.log(rampartPos.length);
    map.addStructure("rampart", 8, 1, ...rampartPos);
    accessData.rampartNum += rampartPos.length;
    accessData.cost += rampartPos.length * 1e6;
    accessData.existLayout = true;
    return accessData;
}

interface LayoutAccessData {
    existLayout: boolean;
    cost: number;
    rampartNum: number;
    reason: string;
}

interface LayoutFilterData {
    x: number;
    y: number;
    isGood: boolean;
    cost: number;
    rampartNum: number;
    reason: string;
}
