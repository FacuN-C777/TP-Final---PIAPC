import { cellKey, cellsEqual, isWalkable, type Cell } from './grid';

export type SearchAlgorithm = 'BFS' | 'DFS' | 'A*';

const NEIGHBOR_OFFSETS: readonly Cell[] = [
    { col: 0, row: -1 },
    { col: 1, row: 0 },
    { col: 0, row: 1 },
    { col: -1, row: 0 }
];

export type PassableCell = (cell: Cell) => boolean;

function getNeighbors (cell: Cell, isPassable: PassableCell): Cell[]
{
    return NEIGHBOR_OFFSETS
        .map((offset) => ({ col: cell.col + offset.col, row: cell.row + offset.row }))
        .filter((neighbor) => isPassable(neighbor));
}

function reconstructPath (cameFrom: ReadonlyMap<string, Cell>, goal: Cell): Cell[]
{
    const path: Cell[] = [goal];
    let current = goal;
    let previous = cameFrom.get(cellKey(current));

    while (previous)
    {
        path.push(previous);
        current = previous;
        previous = cameFrom.get(cellKey(current));
    }

    path.reverse();

    return path;
}

function searchBfs (start: Cell, goal: Cell, isPassable: PassableCell): Cell[] | null
{
    const queue: Cell[] = [start];
    let head = 0;
    const visited = new Set<string>([cellKey(start)]);
    const cameFrom = new Map<string, Cell>();

    while (head < queue.length)
    {
        const current = queue[head];
        head++;

        if (cellsEqual(current, goal))
        {
            return reconstructPath(cameFrom, goal);
        }

        for (const neighbor of getNeighbors(current, isPassable))
        {
            const key = cellKey(neighbor);

            if (visited.has(key))
            {
                continue;
            }

            visited.add(key);
            cameFrom.set(key, current);
            queue.push(neighbor);
        }
    }

    return null;
}

function searchDfs (start: Cell, goal: Cell, isPassable: PassableCell): Cell[] | null
{
    const stack: Cell[] = [start];
    const visited = new Set<string>([cellKey(start)]);
    const cameFrom = new Map<string, Cell>();

    while (stack.length > 0)
    {
        const current = stack.pop() as Cell;

        if (cellsEqual(current, goal))
        {
            return reconstructPath(cameFrom, goal);
        }

        const neighbors = getNeighbors(current, isPassable);

        for (let index = neighbors.length - 1; index >= 0; index--)
        {
            const neighbor = neighbors[index];
            const key = cellKey(neighbor);

            if (visited.has(key))
            {
                continue;
            }

            visited.add(key);
            cameFrom.set(key, current);
            stack.push(neighbor);
        }
    }

    return null;
}

function manhattanDistance (a: Cell, b: Cell): number
{
    return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

function searchAStar (start: Cell, goal: Cell, isPassable: PassableCell): Cell[] | null
{
    const open: Cell[] = [start];
    const openKeys = new Set<string>([cellKey(start)]);
    const cameFrom = new Map<string, Cell>();
    const gScore = new Map<string, number>([[cellKey(start), 0]]);
    const fScore = new Map<string, number>([[cellKey(start), manhattanDistance(start, goal)]]);

    while (open.length > 0)
    {
        let bestIndex = 0;
        let bestKey = cellKey(open[0]);
        let bestF = fScore.get(bestKey) ?? Infinity;

        for (let index = 1; index < open.length; index++)
        {
            const key = cellKey(open[index]);
            const score = fScore.get(key) ?? Infinity;

            if (score < bestF)
            {
                bestIndex = index;
                bestKey = key;
                bestF = score;
            }
        }

        const current = open[bestIndex];
        open.splice(bestIndex, 1);
        openKeys.delete(bestKey);

        if (cellsEqual(current, goal))
        {
            return reconstructPath(cameFrom, goal);
        }

        const currentKey = cellKey(current);
        const currentG = gScore.get(currentKey) ?? Infinity;

        for (const neighbor of getNeighbors(current, isPassable))
        {
            const neighborKey = cellKey(neighbor);
            const tentativeG = currentG + 1;

            if (tentativeG >= (gScore.get(neighborKey) ?? Infinity))
            {
                continue;
            }

            cameFrom.set(neighborKey, current);
            gScore.set(neighborKey, tentativeG);
            fScore.set(neighborKey, tentativeG + manhattanDistance(neighbor, goal));

            if (!openKeys.has(neighborKey))
            {
                open.push(neighbor);
                openKeys.add(neighborKey);
            }
        }
    }

    return null;
}

export function findPathWithPassable (
    start: Cell,
    goal: Cell,
    algorithm: SearchAlgorithm,
    isPassable: PassableCell
): Cell[] | null
{
    if (!isPassable(start) || !isPassable(goal))
    {
        return null;
    }

    if (cellsEqual(start, goal))
    {
        return [start];
    }

    if (algorithm === 'BFS')
    {
        return searchBfs(start, goal, isPassable);
    }

    if (algorithm === 'DFS')
    {
        return searchDfs(start, goal, isPassable);
    }

    return searchAStar(start, goal, isPassable);
}

export function findPath (start: Cell, goal: Cell, algorithm: SearchAlgorithm): Cell[] | null
{
    return findPathWithPassable(start, goal, algorithm, isWalkable);
}

export function findGuardPath (
    start: Cell,
    goal: Cell,
    algorithm: SearchAlgorithm,
    door: Cell
): Cell[] | null
{
    const isPassable: PassableCell = (cell) => {
        return isWalkable(cell) || cellsEqual(cell, door);
    };

    return findPathWithPassable(start, goal, algorithm, isPassable);
}
