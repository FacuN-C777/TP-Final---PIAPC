import {
    GRID_COLUMNS,
    GRID_ROWS,
    cellKey,
    cellsEqual,
    isValidCell,
    type Cell
} from './grid';

export type GuardCount = 1 | 2;

export interface Scenario
{
    readonly map: string[];
    readonly start: Cell;
    readonly key: Cell;
    readonly door: Cell;
    readonly treasures: Cell[];
    readonly exit: Cell;
    readonly hidingSpots: Cell[];
    readonly guards: Cell[];
}

export interface GenerateScenarioOptions
{
    readonly guardCount: GuardCount;
}

type Orientation = 'vertical' | 'horizontal';

const MAX_ATTEMPTS = 200;
const NEIGHBOR_OFFSETS: readonly Cell[] = [
    { col: 0, row: -1 },
    { col: 1, row: 0 },
    { col: 0, row: 1 },
    { col: -1, row: 0 }
];

function randomInt (min: number, max: number): number
{
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T> (items: readonly T[]): T
{
    return items[randomInt(0, items.length - 1)];
}

function manhattanDistance (a: Cell, b: Cell): number
{
    return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

function isBorder (cell: Cell): boolean
{
    return cell.col === 0 || cell.col === GRID_COLUMNS - 1
        || cell.row === 0 || cell.row === GRID_ROWS - 1;
}

function getNeighborCells (cell: Cell): Cell[]
{
    return NEIGHBOR_OFFSETS.map((offset) => ({
        col: cell.col + offset.col,
        row: cell.row + offset.row
    }));
}

function createEmptyMap (): string[][]
{
    const grid: string[][] = [];

    for (let row = 0; row < GRID_ROWS; row++)
    {
        const cells: string[] = [];

        for (let col = 0; col < GRID_COLUMNS; col++)
        {
            const cell: Cell = { col, row };

            cells.push(isBorder(cell) ? '#' : '.');
        }

        grid.push(cells);
    }

    return grid;
}

function buildBarrier (grid: string[][], orientation: Orientation): Cell
{
    if (orientation === 'vertical')
    {
        let column = randomInt(5, 11);
        const doorRow = randomInt(1, GRID_ROWS - 2);
        let door: Cell = { col: column, row: doorRow };

        for (let row = 0; row < GRID_ROWS; row++)
        {
            if (row > 0)
            {
                column = Math.max(5, Math.min(11, column + randomInt(-1, 1)));
            }

            grid[row][column] = '#';

            if (row === doorRow)
            {
                door = { col: column, row };
            }
        }

        return door;
    }

    let row = randomInt(4, 8);
    const doorColumn = randomInt(1, GRID_COLUMNS - 2);
    let door: Cell = { col: doorColumn, row };

    for (let col = 0; col < GRID_COLUMNS; col++)
    {
        if (col > 0)
        {
            row = Math.max(4, Math.min(8, row + randomInt(-1, 1)));
        }

        grid[row][col] = '#';

        if (col === doorColumn)
        {
            door = { col, row };
        }
    }

    return door;
}

function getProtectedCells (door: Cell, orientation: Orientation): Set<string>
{
    const protectedCells = new Set<string>([cellKey(door)]);

    if (orientation === 'vertical')
    {
        protectedCells.add(cellKey({ col: door.col - 1, row: door.row }));
        protectedCells.add(cellKey({ col: door.col + 1, row: door.row }));
    }
    else
    {
        protectedCells.add(cellKey({ col: door.col, row: door.row - 1 }));
        protectedCells.add(cellKey({ col: door.col, row: door.row + 1 }));
    }

    return protectedCells;
}

function addDecorativeWalls (grid: string[][], door: Cell, orientation: Orientation): void
{
    const protectedCells = getProtectedCells(door, orientation);
    const targetWalls = randomInt(7, 13);
    let placed = 0;

    for (let attempt = 0; attempt < targetWalls * 12 && placed < targetWalls; attempt++)
    {
        const cell: Cell = {
            col: randomInt(1, GRID_COLUMNS - 2),
            row: randomInt(1, GRID_ROWS - 2)
        };
        const key = cellKey(cell);

        if (grid[cell.row][cell.col] !== '.' || protectedCells.has(key))
        {
            continue;
        }

        grid[cell.row][cell.col] = '#';
        placed++;

        if (Math.random() < 0.35)
        {
            const neighbor = randomChoice(getNeighborCells(cell));

            if (
                isValidCell(neighbor)
                && !isBorder(neighbor)
                && grid[neighbor.row][neighbor.col] === '.'
                && !protectedCells.has(cellKey(neighbor))
            )
            {
                grid[neighbor.row][neighbor.col] = '#';
            }
        }
    }
}

function isPassable (
    map: readonly string[],
    cell: Cell,
    door: Cell,
    doorOpen: boolean
): boolean
{
    if (!isValidCell(cell))
    {
        return false;
    }

    if (doorOpen && cellsEqual(cell, door))
    {
        return true;
    }

    return map[cell.row][cell.col] !== '#';
}

function flood (
    map: readonly string[],
    start: Cell,
    door: Cell,
    doorOpen: boolean
): Set<string>
{
    const visited = new Set<string>();

    if (!isPassable(map, start, door, doorOpen))
    {
        return visited;
    }

    visited.add(cellKey(start));

    const queue: Cell[] = [start];
    let head = 0;

    while (head < queue.length)
    {
        const current = queue[head];
        head++;

        for (const neighbor of getNeighborCells(current))
        {
            const key = cellKey(neighbor);

            if (visited.has(key) || !isPassable(map, neighbor, door, doorOpen))
            {
                continue;
            }

            visited.add(key);
            queue.push(neighbor);
        }
    }

    return visited;
}

function countOpenNeighbors (map: readonly string[], cell: Cell): number
{
    return getNeighborCells(cell).filter((neighbor) => {
        return isValidCell(neighbor) && map[neighbor.row][neighbor.col] !== '#';
    }).length;
}

function hasWallNeighbor (map: readonly string[], cell: Cell): boolean
{
    return getNeighborCells(cell).some((neighbor) => {
        return isValidCell(neighbor) && map[neighbor.row][neighbor.col] === '#';
    });
}

function isHidingCandidate (map: readonly string[], cell: Cell): boolean
{
    const openNeighbors = countOpenNeighbors(map, cell);

    if (openNeighbors <= 1)
    {
        return true;
    }

    return openNeighbors === 2 && hasWallNeighbor(map, cell);
}

function collectOpenCells (map: readonly string[]): Cell[]
{
    const cells: Cell[] = [];

    for (let row = 0; row < GRID_ROWS; row++)
    {
        for (let col = 0; col < GRID_COLUMNS; col++)
        {
            if (map[row][col] !== '#')
            {
                cells.push({ col, row });
            }
        }
    }

    return cells;
}

export function validateScenario (scenario: Scenario, guardCount: GuardCount): boolean
{
    const {
        map,
        start,
        key,
        door,
        treasures,
        exit,
        hidingSpots,
        guards
    } = scenario;

    if (map.length !== GRID_ROWS)
    {
        return false;
    }

    for (let row = 0; row < GRID_ROWS; row++)
    {
        if (map[row].length !== GRID_COLUMNS)
        {
            return false;
        }

        for (let col = 0; col < GRID_COLUMNS; col++)
        {
            if (isBorder({ col, row }) && map[row][col] !== '#')
            {
                return false;
            }
        }
    }

    if (!isValidCell(door) || map[door.row][door.col] !== '#')
    {
        return false;
    }

    if (treasures.length < 2 || treasures.length > 3)
    {
        return false;
    }

    if (hidingSpots.length < 1 || hidingSpots.length > 2)
    {
        return false;
    }

    if (guards.length !== guardCount)
    {
        return false;
    }

    const positions: Cell[] = [
        start,
        key,
        door,
        ...treasures,
        exit,
        ...hidingSpots,
        ...guards
    ];
    const positionKeys = new Set<string>();

    for (const cell of positions)
    {
        if (!isValidCell(cell))
        {
            return false;
        }

        const key = cellKey(cell);

        if (positionKeys.has(key))
        {
            return false;
        }

        positionKeys.add(key);
    }

    const walkablePositions: Cell[] = [
        start,
        key,
        ...treasures,
        exit,
        ...hidingSpots,
        ...guards
    ];

    if (walkablePositions.some((cell) => map[cell.row][cell.col] === '#'))
    {
        return false;
    }

    const closedReach = flood(map, start, door, false);
    const openReach = flood(map, start, door, true);

    if (!closedReach.has(cellKey(key)) || closedReach.has(cellKey(exit)))
    {
        return false;
    }

    if (!openReach.has(cellKey(exit)))
    {
        return false;
    }

    const reachableElements: Cell[] = [
        key,
        ...treasures,
        ...hidingSpots,
        ...guards
    ];

    if (reachableElements.some((cell) => !openReach.has(cellKey(cell))))
    {
        return false;
    }

    if (!treasures.some((cell) => !closedReach.has(cellKey(cell))))
    {
        return false;
    }

    if (guards.some((guard) => manhattanDistance(guard, start) < 3))
    {
        return false;
    }

    if (hidingSpots.some((spot) => !isHidingCandidate(map, spot)))
    {
        return false;
    }

    return true;
}

function tryGenerate (guardCount: GuardCount): Scenario | null
{
    const grid = createEmptyMap();
    const orientation: Orientation = Math.random() < 0.5 ? 'vertical' : 'horizontal';
    const door = buildBarrier(grid, orientation);

    addDecorativeWalls(grid, door, orientation);

    const map = grid.map((row) => row.join(''));
    const openCells = collectOpenCells(map);

    if (openCells.length < 70)
    {
        return null;
    }

    const start = randomChoice(openCells);
    const closedReach = flood(map, start, door, false);
    const openReach = flood(map, start, door, true);
    const sideA: Cell[] = [];
    const sideB: Cell[] = [];

    for (const cell of openCells)
    {
        const key = cellKey(cell);

        if (closedReach.has(key))
        {
            sideA.push(cell);
        }
        else if (openReach.has(key))
        {
            sideB.push(cell);
        }
    }

    if (sideA.length < 6 || sideB.length < 6)
    {
        return null;
    }

    const keyCandidates = sideA.filter((cell) => !cellsEqual(cell, start));

    if (keyCandidates.length === 0)
    {
        return null;
    }

    const key = randomChoice(keyCandidates);
    const exitCandidates = sideB.filter((cell) => !cellsEqual(cell, key));

    if (exitCandidates.length === 0)
    {
        return null;
    }

    const exit = randomChoice(exitCandidates);
    const used = new Set<string>([
        cellKey(start),
        cellKey(key),
        cellKey(exit),
        cellKey(door)
    ]);

    const treasureCount = randomInt(2, 3);
    const firstTreasureCandidates = sideB.filter((cell) => !used.has(cellKey(cell)));

    if (firstTreasureCandidates.length === 0)
    {
        return null;
    }

    const treasures: Cell[] = [randomChoice(firstTreasureCandidates)];
    used.add(cellKey(treasures[0]));

    const reachableCells = openCells.filter((cell) => openReach.has(cellKey(cell)));
    const remainingTreasureCandidates = reachableCells.filter((cell) => !used.has(cellKey(cell)));

    while (treasures.length < treasureCount)
    {
        if (remainingTreasureCandidates.length === 0)
        {
            return null;
        }

        const index = randomInt(0, remainingTreasureCandidates.length - 1);
        const treasure = remainingTreasureCandidates.splice(index, 1)[0];

        treasures.push(treasure);
        used.add(cellKey(treasure));
    }

    const hidingCount = randomInt(1, 2);
    const hidingCandidates = reachableCells.filter((cell) => {
        return !used.has(cellKey(cell)) && isHidingCandidate(map, cell);
    });
    const hidingSpots: Cell[] = [];

    while (hidingSpots.length < hidingCount)
    {
        if (hidingCandidates.length === 0)
        {
            return null;
        }

        const index = randomInt(0, hidingCandidates.length - 1);
        const spot = hidingCandidates.splice(index, 1)[0];

        hidingSpots.push(spot);
        used.add(cellKey(spot));
    }

    const guardCandidates = reachableCells.filter((cell) => {
        return !used.has(cellKey(cell)) && manhattanDistance(cell, start) >= 4;
    });
    const guards: Cell[] = [];

    while (guards.length < guardCount)
    {
        if (guardCandidates.length === 0)
        {
            return null;
        }

        const index = randomInt(0, guardCandidates.length - 1);
        const guard = guardCandidates.splice(index, 1)[0];

        guards.push(guard);
        used.add(cellKey(guard));
    }

    const scenario: Scenario = {
        map,
        start,
        key,
        door,
        treasures,
        exit,
        hidingSpots,
        guards
    };

    return validateScenario(scenario, guardCount) ? scenario : null;
}

function createFallbackScenario (guardCount: GuardCount): Scenario
{
    const map: string[] = [
        '#################',
        '#.......#.......#',
        '#.......#.......#',
        '#.......#.......#',
        '#.......#.......#',
        '#.......#.......#',
        '#.......#.......#',
        '#.......#.......#',
        '#.......#.......#',
        '#.......#.......#',
        '#.......#.......#',
        '#.......#.......#',
        '#################'
    ];

    return {
        map,
        start: { col: 2, row: 2 },
        key: { col: 3, row: 2 },
        door: { col: 8, row: 6 },
        treasures: [
            { col: 13, row: 10 },
            { col: 13, row: 2 },
            { col: 2, row: 10 }
        ],
        exit: { col: 14, row: 10 },
        hidingSpots: [
            { col: 1, row: 1 },
            { col: 15, row: 11 }
        ],
        guards: guardCount === 1
            ? [{ col: 14, row: 2 }]
            : [{ col: 14, row: 2 }, { col: 12, row: 10 }]
    };
}

export function generateScenario ({ guardCount }: GenerateScenarioOptions): Scenario
{
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++)
    {
        const scenario = tryGenerate(guardCount);

        if (scenario)
        {
            return scenario;
        }
    }

    return createFallbackScenario(guardCount);
}
