export interface PortalPathDetail {
    name: string;
    from: string;
    to: string;
    /**
     * 起始的shard。对于跨shard寻路，寻路信息存于该fromShard的SharedMemory中。
     */
    fromShard: string;
    exist?: boolean;
    path?: string;
    cost?: number;
    expireTime?: number;
}
