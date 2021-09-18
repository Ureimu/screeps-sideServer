想法：（仅仅针对于 source 之间和 controller 距离比较远的类型）找一个（包含至少一个 （source 的一格范围内空格））的 周围空格最多 的 3x3 的空格（变种：菱形的空格），放一个 spawn，一些 ex（估计在 7 个左右，大概能用到 3 级） 和 link，harvester 不在 container 上工作，当 container 有能量而旁边 ex 和 spawn 没能量时补能量。
harvester 在采集能量时看自己能量快到到 capacity 的前一个 tick 进行 transfer 能量到 container。energy 按顺时针取用，harvester 也按顺时针补充能量。同时 harvester 预判自己能量是否会提前用完，在用完之前对 container withdraw。修 9 个路。估计 body 给个 1. w2c1m1
