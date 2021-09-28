/* eslint-disable id-blacklist */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
// https://github.com/bencbartlett/Overmind/blob/master/src/algorithms/minCut.ts
/**
 * Code for calculating the minCut in a room, written by Saruss,
 * adapted for Typescript and flexible room subsets by Chobobobo,
 * modified and debugged by Muon.
 */

import { Range } from "utils/common/type";
import { GridMap } from "utils/RoomGridMap";
import { SvgCode } from "utils/SvgCode";

const UNWALKABLE = -10;
const RANGE_MODIFIER = 1; // this parameter sets the scaling of weights to prefer walls closer protection bounds
const RANGE_PADDING = 3; // max range to reduce weighting; RANGE_MODIFIER * RANGE_PADDING must be < PROTECTED
const NORMAL = 0;
const PROTECTED = 10;
const CANNOT_BUILD = 20;
const EXIT = 30;

/**
 * @property {number} capacity - The flow capacity of this edge
 * @property {number} flow - The current flow of this edge
 * @property {number} resEdge -
 * @property {number} to - where this edge leads to
 */
export interface Edge {
    capacity: number;
    flow: number;
    resEdge: number;
    to: number;
}

interface Coord {
    x: number;
    y: number;
}

/**
 * @property {number} xMin - Top left corner
 * @property {number} xMin - Top left corner
 * @property {number} xMax - Bottom right corner
 * @property {number} yMax - Bottom right corner
 */
export type Rectangle = Range;

export class Graph {
    private totalVertices: number;
    private level: number[];
    private edges: { [from: number]: Edge[] };

    public constructor(totalVertices: number) {
        this.totalVertices = totalVertices;
        this.level = Array(totalVertices) as number[];
        // An array of edges for each vertex
        this.edges = Array(totalVertices)
            .fill(0)
            .map(x => []);
    }

    /**
     * Create a new edge in the graph as well as a corresponding reverse edge on the residual graph
     * @param from - vertex edge starts at
     * @param to - vertex edge leads to
     * @param capacity - max flow capacity for this edge
     */
    public newEdge(from: number, to: number, capacity: number): void {
        // Normal forward Edge
        this.edges[from].push({ to, resEdge: this.edges[to].length, capacity, flow: 0 });
        // reverse Edge for Residual Graph
        this.edges[to].push({ to: from, resEdge: this.edges[from].length - 1, capacity: 0, flow: 0 });
    }

    /**
     * Uses Breadth First Search to see if a path exists to the vertex 'to' and generate the level graph
     * @param from - vertex to start from
     * @param to - vertex to try and reach
     */
    private createLevelGraph(from: number, to: number) {
        if (to >= this.totalVertices) {
            return false;
        }
        this.level.fill(-1); // reset old levels
        this.level[from] = 0;
        const q: number[] = []; // queue with s as starting point
        q.push(from);
        let u = 0;
        let edge = null;
        while (q.length) {
            u = q.shift()!;
            for (edge of this.edges[u]) {
                if (this.level[edge.to] < 0 && edge.flow < edge.capacity) {
                    this.level[edge.to] = this.level[u] + 1;
                    q.push(edge.to);
                }
            }
        }
        return this.level[to] >= 0; // return if theres a path, no level, no path!
    }

    /**
     * Depth First Search-like: send flow at along path from from->to recursively while increasing the level of the
     * visited vertices by one
     * @param start - the vertex to start at
     * @param end - the vertex to try and reach
     * @param targetFlow - the amount of flow to try and achieve
     * @param count - keep track of which vertices have been visited so we don't include them twice
     */
    private calcFlow(start: number, end: number, targetFlow: number, count: number[]) {
        if (start === end) {
            // Sink reached , abort recursion
            return targetFlow;
        }
        let edge: Edge;
        let flowTillHere = 0;
        let flowToT = 0;
        while (count[start] < this.edges[start].length) {
            // Visit all edges of the vertex one after the other
            edge = this.edges[start][count[start]];
            if (this.level[edge.to] === this.level[start] + 1 && edge.flow < edge.capacity) {
                // Edge leads to Vertex with a level one higher, and has flow left
                flowTillHere = Math.min(targetFlow, edge.capacity - edge.flow);
                flowToT = this.calcFlow(edge.to, end, flowTillHere, count);
                if (flowToT > 0) {
                    edge.flow += flowToT; // Add Flow to current edge
                    // subtract from reverse Edge -> Residual Graph neg. Flow to use backward direction of BFS/DFS
                    this.edges[edge.to][edge.resEdge].flow -= flowToT;
                    return flowToT;
                }
            }
            count[start]++;
        }
        return 0;
    }

    /**
     * Uses Breadth First Search to find the vertices in the minCut for the graph
     * - Must call calcMinCut first to prepare the graph
     * @param from - the vertex to start from
     */
    public getMinCut(from: number): number[] {
        const eInCut = [];
        this.level.fill(-1);
        this.level[from] = 1;
        const q = [];
        q.push(from);
        let u = 0;
        let edge: Edge;
        while (q.length) {
            u = q.shift()!;
            for (edge of this.edges[u]) {
                if (edge.flow < edge.capacity) {
                    if (this.level[edge.to] < 1) {
                        this.level[edge.to] = 1;
                        q.push(edge.to);
                    }
                }
                if (edge.flow === edge.capacity && edge.capacity > 0) {
                    // blocking edge -> could be in min cut
                    eInCut.push({ to: edge.to, unreachable: u });
                }
            }
        }

        const minCut = [];
        let cutEdge: { to: number; unreachable: number };
        for (cutEdge of eInCut) {
            if (this.level[cutEdge.to] === -1) {
                // Only edges which are blocking and lead to the sink from unreachable vertices are in the min cut
                minCut.push(cutEdge.unreachable);
            }
        }
        return minCut;
    }

    /**
     * Calculates min-cut graph using Dinic's Algorithm.
     * use getMinCut to get the actual verticies in the minCut
     * @param source - Source vertex
     * @param sink - Sink vertex
     */
    public calcMinCut(source: number, sink: number): number {
        if (source === sink) {
            return -1;
        }
        let ret = 0;
        let count = [];
        let flow = 0;
        while (this.createLevelGraph(source, sink)) {
            count = Array(this.totalVertices + 1).fill(0);
            do {
                flow = this.calcFlow(source, sink, Number.MAX_VALUE, count);
                if (flow > 0) {
                    ret += flow;
                }
            } while (flow);
        }
        return ret;
    }
}

/**
 * An Array with Terrain information: -1 not usable, 2 Sink (Leads to Exit)
 * @param room - the room to generate the terrain map from
 */
export function get2DArray(map: GridMap, bounds: Rectangle = { xMin: 0, yMin: 0, xMax: 49, yMax: 49 }): number[][] {
    const room2D = Array(50)
        .fill(NORMAL)
        .map(d => Array(50).fill(NORMAL) as number[]); // Array for room tiles
    let x: number;
    let y: number;

    const terrain = map.grid;

    for (x = bounds.xMin; x <= bounds.xMax; x++) {
        for (y = bounds.yMin; y <= bounds.yMax; y++) {
            if (terrain[x][y].terrain === "wall") {
                room2D[x][y] = UNWALKABLE; // Mark unwalkable
            } else if (x === bounds.xMin || y === bounds.yMin || x === bounds.xMax || y === bounds.yMax) {
                room2D[x][y] = EXIT; // Mark exit tiles
            }
        }
    }

    // Marks tiles as unbuildable if they are proximate to exits
    for (y = bounds.yMin + 1; y <= bounds.yMax - 1; y++) {
        if (room2D[bounds.xMin][y] === EXIT) {
            for (const dy of [-1, 0, 1]) {
                if (room2D[bounds.xMin + 1][y + dy] !== UNWALKABLE) {
                    room2D[bounds.xMin + 1][y + dy] = CANNOT_BUILD;
                }
            }
        }
        if (room2D[bounds.xMax][y] === EXIT) {
            for (const dy of [-1, 0, 1]) {
                if (room2D[bounds.xMax - 1][y + dy] !== UNWALKABLE) {
                    room2D[bounds.xMax - 1][y + dy] = CANNOT_BUILD;
                }
            }
        }
    }
    for (x = bounds.xMin + 1; x <= bounds.xMax - 1; x++) {
        if (room2D[x][bounds.yMin] === EXIT) {
            for (const dx of [-1, 0, 1]) {
                if (room2D[x + dx][bounds.yMin + 1] !== UNWALKABLE) {
                    room2D[x + dx][bounds.yMin + 1] = CANNOT_BUILD;
                }
            }
        }
        if (room2D[x][bounds.yMax] === EXIT) {
            for (const dx of [-1, 0, 1]) {
                if (room2D[x + dx][bounds.yMax - 1] !== UNWALKABLE) {
                    room2D[x + dx][bounds.yMax - 1] = CANNOT_BUILD;
                }
            }
        }
    }

    return room2D;
}

/**
 * Function to create Source, Sink, Tiles arrays: takes a rectangle-Array as input for Tiles that are to Protect
 * @param room - the room to consider
 * @param toProtect - the coordinates to protect inside the walls
 * @param bounds - the area to consider for the minCut
 */
export function createGraph(
    map: GridMap,
    toProtect: Rectangle[],
    preferCloserBarriers = true,
    preferCloserBarrierLimit = Infinity, // ignore the toProtect[n] for n > this value
    visualize = true,
    bounds: Rectangle = { xMin: 0, xMax: 49, yMin: 0, yMax: 49 }
): Graph | void {
    const visual = new SvgCode(bounds);
    const roomArray = get2DArray(map, bounds);
    // For all Rectangles, set edges as source (to protect area) and area as unused
    let r: Rectangle;
    let x: number;
    let y: number;
    for (r of toProtect) {
        if (
            bounds.xMin >= bounds.xMax ||
            bounds.yMin >= bounds.yMax ||
            bounds.xMin < 0 ||
            bounds.yMin < 0 ||
            bounds.xMax > 49 ||
            bounds.yMax > 49
        ) {
            return console.log("ERROR: Invalid bounds", JSON.stringify(bounds));
        } else if (r.xMin >= r.xMax || r.yMin >= r.yMax) {
            return console.log("ERROR: Rectangle", JSON.stringify(r), "invalid.");
        } else if (r.xMin < bounds.xMin || r.xMax > bounds.xMax || r.yMin < bounds.yMin || r.yMax > bounds.yMax) {
            return console.log("ERROR: Rectangle", JSON.stringify(r), "out of bounds:", JSON.stringify(bounds));
        }
        for (x = r.xMin; x <= r.xMax; x++) {
            for (y = r.yMin; y <= r.yMax; y++) {
                if (x === r.xMin || x === r.xMax || y === r.yMin || y === r.yMax) {
                    if (roomArray[x][y] === NORMAL) {
                        roomArray[x][y] = PROTECTED;
                    }
                } else {
                    roomArray[x][y] = UNWALKABLE;
                }
            }
        }
    }
    // Preferentially weight closer tiles
    if (preferCloserBarriers) {
        for (r of _.take(toProtect, preferCloserBarrierLimit)) {
            const [xMin, xMax] = [Math.max(r.xMin - RANGE_PADDING, 0), Math.min(r.xMax + RANGE_PADDING, 49)];
            const [yMin, yMax] = [Math.max(r.yMin - RANGE_PADDING, 0), Math.min(r.yMax + RANGE_PADDING, 49)];
            for (x = xMin; x <= xMax; x++) {
                for (y = yMin; y <= yMax; y++) {
                    if (roomArray[x][y] >= NORMAL && roomArray[x][y] < PROTECTED) {
                        const x1range = Math.max(r.xMin - x, 0);
                        const x2range = Math.max(x - r.xMax, 0);
                        const y1range = Math.max(r.yMin - y, 0);
                        const y2range = Math.max(y - r.yMax, 0);
                        const rangeToBorder = Math.max(x1range, x2range, y1range, y2range);
                        const modifiedWeight = NORMAL + RANGE_MODIFIER * (RANGE_PADDING - rangeToBorder);
                        roomArray[x][y] = Math.max(roomArray[x][y], modifiedWeight);
                        if (visualize) {
                            visual.text(`${roomArray[x][y]}`, { x, y });
                        }
                    }
                }
            }
        }
    }

    // ********************** Visualization
    const opacity = 0.07;
    if (visualize) {
        console.log("visual");
        for (x = bounds.xMin; x <= bounds.xMax; x++) {
            for (y = bounds.yMin; y <= bounds.yMax; y++) {
                if (roomArray[x][y] === UNWALKABLE) {
                    visual.circle({ x, y }, { r: 0.5, fill: "#1b1b9f", opacity });
                } else if (roomArray[x][y] > UNWALKABLE && roomArray[x][y] < NORMAL) {
                    visual.circle({ x, y }, { r: 0.5, fill: "#42cce8", opacity });
                } else if (roomArray[x][y] === NORMAL) {
                    visual.circle({ x, y }, { r: 0.5, fill: "#bdb8b8", opacity });
                } else if (roomArray[x][y] > NORMAL && roomArray[x][y] < PROTECTED) {
                    visual.circle({ x, y }, { r: 0.5, fill: "#9929e8", opacity });
                } else if (roomArray[x][y] === PROTECTED) {
                    visual.circle({ x, y }, { r: 0.5, fill: "#e800c6", opacity });
                } else if (roomArray[x][y] === CANNOT_BUILD) {
                    visual.circle({ x, y }, { r: 0.5, fill: "#e8000f", opacity });
                } else if (roomArray[x][y] === EXIT) {
                    visual.circle({ x, y }, { r: 0.5, fill: "#000000", opacity });
                }
            }
        }
        map.visualizeDataList.push(visual);
    }

    // initialise graph
    // possible 2*50*50 +2 (st) Vertices (Walls etc set to unused later)
    const g = new Graph(2 * 50 * 50 + 2);
    const infini = Number.MAX_VALUE;
    const surr = [
        [0, -1],
        [-1, -1],
        [-1, 0],
        [-1, 1],
        [0, 1],
        [1, 1],
        [1, 0],
        [1, -1]
    ];
    // per Tile (0 in Array) top + bot with edge of c=1 from top to bott  (use every tile once!)
    // infini edge from bot to top vertices of adjacent tiles if they not protected (array =1)
    // (no reverse edges in normal graph)
    // per prot. Tile (1 in array) Edge from source to this tile with infini cap.
    // per exit Tile (2in array) Edge to sink with infini cap.
    // source is at  pos 2*50*50, sink at 2*50*50+1 as first tile is 0,0 => pos 0
    // top vertices <-> x,y : v=y*50+x   and x= v % 50  y=v/50 (math.floor?)
    // bot vertices <-> top + 2500
    const source = 2 * 50 * 50;
    const sink = 2 * 50 * 50 + 1;
    let top = 0;
    let bot = 0;
    let dx = 0;
    let dy = 0;
    // max = 49;
    const baseCapacity = 10;
    const modifyWeight = preferCloserBarriers ? 1 : 0;
    for (x = bounds.xMin + 1; x < bounds.xMax; x++) {
        for (y = bounds.yMin + 1; y < bounds.yMax; y++) {
            top = y * 50 + x;
            bot = top + 2500;
            if (roomArray[x][y] >= NORMAL && roomArray[x][y] <= PROTECTED) {
                if (roomArray[x][y] >= NORMAL && roomArray[x][y] < PROTECTED) {
                    g.newEdge(top, bot, baseCapacity - modifyWeight * roomArray[x][y]); // add surplus weighting
                } else if (roomArray[x][y] === PROTECTED) {
                    // connect this to the source
                    g.newEdge(source, top, infini);
                    g.newEdge(top, bot, baseCapacity - modifyWeight * RANGE_PADDING * RANGE_MODIFIER);
                }
                for (let i = 0; i < 8; i++) {
                    // attach adjacent edges
                    dx = x + surr[i][0];
                    dy = y + surr[i][1];
                    if (
                        (roomArray[dx][dy] >= NORMAL && roomArray[dx][dy] < PROTECTED) ||
                        roomArray[dx][dy] === CANNOT_BUILD
                    ) {
                        g.newEdge(bot, dy * 50 + dx, infini);
                    }
                }
            } else if (roomArray[x][y] === CANNOT_BUILD) {
                // near Exit
                g.newEdge(top, sink, infini);
            }
        }
    } // graph finished
    map.visualizeDataList.push(visual);
    return g;
}

/**
 * Main function to be called by user: calculate min cut tiles from room using rectangles as protected areas
 * @param room - the room to use
 * @param rectangles - the areas to protect, defined as rectangles
 * @param bounds - the area to be considered for the minCut
 */
export function getCutTiles(
    map: GridMap,
    toProtect: Rectangle[],
    preferCloserBarriers = true,
    preferCloserBarrierLimit = Infinity,
    visualize = true,
    bounds: Rectangle = { xMin: 0, yMin: 0, xMax: 49, yMax: 49 }
): Coord[] {
    const graph = createGraph(map, toProtect, preferCloserBarriers, preferCloserBarrierLimit, visualize, bounds);
    if (!graph) {
        return [];
    }
    let x: number;
    let y: number;
    const source = 2 * 50 * 50; // Position Source / Sink in Room-Graph
    const sink = 2 * 50 * 50 + 1;
    const count = graph.calcMinCut(source, sink);
    // console.log('Number of Tiles in Cut:', count);
    const positions = [];
    if (count > 0) {
        const cutVertices = graph.getMinCut(source);
        let v: number;
        for (v of cutVertices) {
            // x= vertex % 50  y=v/50 (math.floor?)
            x = v % 50;
            y = Math.floor(v / 50);
            positions.push({ x, y });
        }
    }
    // Visualise Result
    if (positions.length > 0 && visualize) {
        const visual = new SvgCode({ xMin: 0, yMin: 0, xMax: 49, yMax: 49 });
        for (let i = positions.length - 1; i >= 0; i--) {
            visual.circle({ x: positions[i].x, y: positions[i].y }, { r: 0.5, fill: "#ff7722", opacity: 0.3 });
        }
        map.visualizeDataList.push(visual);
        // global.minCut.ifQuit = false;
        // lobal.minCut.graphingRoom = roomName;
        // global.minCut.graph=visual.export();
        // console.log("[build] 输入minCut.quit()来关闭建筑预览。")
    } else {
        return [];
    }
    const wholeRoom = bounds.xMin === 0 && bounds.yMin === 0 && bounds.xMax === 49 && bounds.yMax === 49;
    return wholeRoom ? positions : pruneDeadEnds(map, positions);
}

/**
 * Removes unnecessary tiles if they are blocking the path to a dead end
 * Useful if minCut has been run on a subset of the room
 * @param roomName - Room to work in
 * @param cutTiles - Array of tiles which are in the minCut
 */
export function pruneDeadEnds(map: GridMap, cutTiles: Coord[]): Coord[] {
    // Get Terrain and set all cut-tiles as unwalkable
    const roomArray = get2DArray(map);
    let tile: Coord;
    for (tile of cutTiles) {
        roomArray[tile.x][tile.y] = UNWALKABLE;
    }
    // Floodfill from exits: save exit tiles in array and do a BFS-like search
    const unvisited: number[] = [];
    let y: number;
    let x: number;
    for (y = 0; y < 49; y++) {
        if (roomArray[0][y] === EXIT) {
            console.log("prune: toExit", 0, y);
            unvisited.push(50 * y);
        }
        if (roomArray[49][y] === EXIT) {
            console.log("prune: toExit", 49, y);
            unvisited.push(50 * y + 49);
        }
    }
    for (x = 0; x < 49; x++) {
        if (roomArray[x][0] === EXIT) {
            console.log("prune: toExit", x, 0);
            unvisited.push(x);
        }
        if (roomArray[x][49] === EXIT) {
            console.log("prune: toExit", x, 49);
            unvisited.push(2450 + x); // 50*49=2450
        }
    }
    // Iterate over all unvisited EXIT tiles and mark neigbours as EXIT tiles if walkable, add to unvisited
    const surr = [
        [0, -1],
        [-1, -1],
        [-1, 0],
        [-1, 1],
        [0, 1],
        [1, 1],
        [1, 0],
        [1, -1]
    ];
    let currPos: number;
    let dx: number;
    let dy: number;
    while (unvisited.length > 0) {
        currPos = unvisited.pop()!;
        x = currPos % 50;
        y = Math.floor(currPos / 50);
        for (let i = 0; i < 8; i++) {
            dx = x + surr[i][0];
            dy = y + surr[i][1];
            if (dx < 0 || dx > 49 || dy < 0 || dy > 49) {
                continue;
            }
            if ((roomArray[dx][dy] >= NORMAL && roomArray[dx][dy] < PROTECTED) || roomArray[dx][dy] === CANNOT_BUILD) {
                unvisited.push(50 * dy + dx);
                roomArray[dx][dy] = EXIT;
            }
        }
    }
    // Remove min-Cut-Tile if there is no EXIT reachable by it
    let leadsToExit: boolean;
    const validCut: Coord[] = [];
    for (tile of cutTiles) {
        leadsToExit = false;
        for (let j = 0; j < 8; j++) {
            dx = tile.x + surr[j][0];
            dy = tile.y + surr[j][1];
            if (roomArray[dx][dy] === EXIT) {
                leadsToExit = true;
            }
        }
        if (leadsToExit) {
            validCut.push(tile);
        }
    }
    return validCut;
}

/**
 * Example function: demonstrates how to get a min cut with 2 rectangles, which define a "to protect" area
 * @param roomName - the name of the room to use for the test, must be visible
 */
export function getMinCut(map: GridMap, preferCloserBarriers = true): Coord[] {
    const colony = map;
    if (!colony) {
        return [];
    }
    // Rectangle Array, the Rectangles will be protected by the returned tiles
    const rectArray = [];
    const padding = 3;
    const spawns = map.layoutStructures.filter(i => i.type === "spawn");
    for (const spawn of spawns) {
        if (spawn) {
            const { x, y } = spawn;
            const [xMin, yMin] = [Math.max(x - padding, 0), Math.max(y - padding, 0)];
            const [xMax, yMax] = [Math.min(x + padding, 49), Math.min(y + padding, 49)];
            rectArray.push({ xMin, yMin, xMax, yMax });
        }
    }
    const sources = map.findObjects("source");
    for (const source of sources) {
        if (source) {
            const { x, y } = source;
            const [xMin, yMin] = [Math.max(x - padding, 0), Math.max(y - padding, 0)];
            const [xMax, yMax] = [Math.min(x + padding, 49), Math.min(y + padding, 49)];
            rectArray.push({ xMin, yMin, xMax, yMax });
        }
    }
    const controller = map.findObjects("controller")[0];
    if (controller) {
        const { x, y } = controller;
        const [xMin, yMin] = [Math.max(x - 3, 0), Math.max(y - 3, 0)];
        const [xMax, yMax] = [Math.min(x + 3, 49), Math.min(y + 3, 49)];
        rectArray.push({ xMin, yMin, xMax, yMax });
    }
    const extensions = map.layoutStructures.filter(i => i.type === "extension");
    for (const extension of extensions) {
        if (extension) {
            const { x, y } = extension;
            const [xMin, yMin] = [Math.max(x - padding, 0), Math.max(y - padding, 0)];
            const [xMax, yMax] = [Math.min(x + padding, 49), Math.min(y + padding, 49)];
            rectArray.push({ xMin, yMin, xMax, yMax });
        }
    }

    // Get Min cut
    // Positions is an array where to build walls/ramparts
    const positions = getCutTiles(map, rectArray, preferCloserBarriers, 2, true);
    // Test output
    // console.log('Positions returned', positions.length);
    return positions;
}

/**
 * Example function: demonstrates how to get a min cut with 2 rectangles, which define a "to protect" area
 * while considering a subset of the larger room.
 * @param roomName - the name of the room to use for the test, must be visible
 */
export function testMinCutSubset(map: GridMap): string {
    const colony = map;
    if (!colony) {
        return `No colony`;
    }

    // Rectangle Array, the Rectangles will be protected by the returned tiles
    const rectArray = [];
    const padding = 3;
    const storage = colony.layoutStructures.filter(i => i.type === "storage")[0];
    if (storage) {
        const { x, y } = storage;
        rectArray.push({ xMin: x - 5 - padding, yMin: y - 4 - padding, xMax: x + 5 + padding, yMax: y + 6 + padding });
    }
    const controller = map.findObjects("controller")[0];
    if (controller) {
        const { x, y } = controller;
        rectArray.push({ xMin: x - 3 - padding, yMin: y - 0 - padding, xMax: x + 0 + padding, yMax: y + 5 + padding });
    }
    // Get Min cut, returns the positions where ramparts/walls need to be
    const positions = getCutTiles(map, rectArray, true, Infinity, true, {
        xMin: 1,
        yMin: 1,
        xMax: 48,
        yMax: 48
    });
    // Test output
    console.log("Positions returned", positions.length);
    return "Finished";
}
