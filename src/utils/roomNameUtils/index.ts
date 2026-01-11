const ROOM_NAME_REGEX = /^([EW])(\d{1,3})([NS])(\d{1,3})$/;
export const checkHighwayRoomName = /^[EW](?:\d{1,2}0|0)[NS]\d{1,3}$|^[EW]\d{1,3}[NS](?:\d{1,2}0|0)$/;
export const checkControllerRoomName = /(^[WE]\d*[1-9]+[NS]\d*[1-3|7-9]+$)|(^[WE]\d*[1-3|7-9]+[NS]\d*[1-9]+$)/;
export const checkCenter9RoomsName = /^[WE]\d*[4-6]+[NS]\d*[4-6]+$/;
export const checkCenterRoomName = /^[WE]\d*[5]+[NS]\d*[5]+$/;
/**
 * 解析房间名，返回对象 { ew, x, ns, y }
 */
export function parseRoomName(roomName: string): { ew: "E" | "W"; x: number; ns: "N" | "S"; y: number } | null {
    const match = ROOM_NAME_REGEX.exec(roomName);
    if (!match) return null;
    return {
        ew: match[1] as "E" | "W",
        x: parseInt(match[2], 10),
        ns: match[3] as "N" | "S",
        y: parseInt(match[4], 10)
    };
}

/**
 * 根据坐标和方向生成房间名
 */
export function generateRoomName(ew: "E" | "W", x: number, ns: "N" | "S", y: number): string {
    return `${ew}${x}${ns}${y}`;
}

/**
 * 获取给定房间名周围指定范围内的房间名列表（包含自身）
 * @param roomName 房间名
 * @param range 范围（>=0）
 */
export function getSurroundingRoomNames(roomName: string, range: number): string[] {
    const parsed = parseRoomName(roomName);
    if (!parsed) return [];
    const result: string[] = [];
    for (let dx = -range; dx <= range; dx++) {
        for (let dy = -range; dy <= range; dy++) {
            // 计算新坐标和方向
            let nx = parsed.x + dx;
            let n_ew: "E" | "W" = parsed.ew;
            if (nx < 0) {
                n_ew = n_ew === "E" ? "W" : "E";
                nx = -nx - 1;
            }
            let ny = parsed.y + dy;
            let n_ns: "N" | "S" = parsed.ns;
            if (ny < 0) {
                n_ns = n_ns === "N" ? "S" : "N";
                ny = -ny - 1;
            }
            result.push(generateRoomName(n_ew, nx, n_ns, ny));
        }
    }
    return result;
}

/**
 * 计算两个房间名之间的曼哈顿距离，也是1范数
 * @param roomName1 房间名1
 * @param roomName2 房间名2
 * @returns 距离（单位：房间）
 */
export function getRoomDistanceN1(roomName1: string, roomName2: string): number {
    const parsed1 = parseRoomName(roomName1);
    const parsed2 = parseRoomName(roomName2);
    if (!parsed1 || !parsed2) return -1;
    // 计算全局坐标
    const x1 = parsed1.ew === "E" ? parsed1.x : -parsed1.x - 1;
    const y1 = parsed1.ns === "N" ? parsed1.y : -parsed1.y - 1;
    const x2 = parsed2.ew === "E" ? parsed2.x : -parsed2.x - 1;
    const y2 = parsed2.ns === "N" ? parsed2.y : -parsed2.y - 1;
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/**
 * 计算两个房间名之间的距离，是无穷范数。
 * @param roomName1 房间名1
 * @param roomName2 房间名2
 * @returns 距离（单位：房间）
 */
export function getRoomDistanceNInf(roomName1: string, roomName2: string): number {
    const parsed1 = parseRoomName(roomName1);
    const parsed2 = parseRoomName(roomName2);
    if (!parsed1 || !parsed2) return -1;
    // 计算全局坐标
    const x1 = parsed1.ew === "E" ? parsed1.x : -parsed1.x - 1;
    const y1 = parsed1.ns === "N" ? parsed1.y : -parsed1.y - 1;
    const x2 = parsed2.ew === "E" ? parsed2.x : -parsed2.x - 1;
    const y2 = parsed2.ns === "N" ? parsed2.y : -parsed2.y - 1;
    return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}

/**
 * 获取以两个房间名为对角顶点的矩形内的所有房间名（包含边界）
 * @param roomA 第一个房间名
 * @param roomB 第二个房间名
 * @returns 房间名数组
 */
export function getRoomsInRectangle(roomA: string, roomB: string): string[] {
    const pA = parseRoomName(roomA);
    const pB = parseRoomName(roomB);
    if (!pA || !pB) return [];

    // 转换为全局坐标（E/N 为正，W/S 为负且使用 -v-1 映射）
    const gxA = pA.ew === "E" ? pA.x : -pA.x - 1;
    const gyA = pA.ns === "N" ? pA.y : -pA.y - 1;
    const gxB = pB.ew === "E" ? pB.x : -pB.x - 1;
    const gyB = pB.ns === "N" ? pB.y : -pB.y - 1;

    const minX = Math.min(gxA, gxB);
    const maxX = Math.max(gxA, gxB);
    const minY = Math.min(gyA, gyB);
    const maxY = Math.max(gyA, gyB);

    const result: string[] = [];
    for (let gx = minX; gx <= maxX; gx++) {
        for (let gy = minY; gy <= maxY; gy++) {
            // 将全局坐标转换回房间名
            const ew: "E" | "W" = gx >= 0 ? "E" : "W";
            const ns: "N" | "S" = gy >= 0 ? "N" : "S";
            const localX = gx >= 0 ? gx : -gx - 1;
            const localY = gy >= 0 ? gy : -gy - 1;
            result.push(generateRoomName(ew, localX, ns, localY));
        }
    }
    return result;
}
