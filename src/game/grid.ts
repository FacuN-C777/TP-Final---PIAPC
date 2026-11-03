export interface Cell
{
    readonly col: number;
    readonly row: number;
}

export const GRID_COLUMNS = 17;
export const GRID_ROWS = 13;
export const CELL_SIZE = 48;
export const GRID_WIDTH = GRID_COLUMNS * CELL_SIZE;
export const GRID_HEIGHT = GRID_ROWS * CELL_SIZE;
export const GRID_X = (1024 - GRID_WIDTH) / 2;
export const GRID_Y = 96;

export const TEST_MAP: readonly string[] = [
    '#################',
    '#...............#',
    '#.###.#####.###.#',
    '#.#.......#.....#',
    '#.#.#####.#.###.#',
    '#...#...#...#...#',
    '#.###.#.#.#.###.#',
    '#.....#...#.....#',
    '#.###.#####.###.#',
    '#.#...........#.#',
    '#.#.###.###.#...#',
    '#...#.......#...#',
    '#################'
];

function validateMap (map: readonly string[], mapName: string): void
{
    if (map.length !== GRID_ROWS)
    {
        throw new Error(`El ${mapName} debe tener ${GRID_ROWS} filas.`);
    }

    map.forEach((row, index) => {
        if (row.length !== GRID_COLUMNS)
        {
            throw new Error(`La fila ${index} del ${mapName} debe tener ${GRID_COLUMNS} celdas.`);
        }
    });
}

validateMap(TEST_MAP, 'mapa de prueba');

let activeMap: readonly string[] = TEST_MAP;

export function setActiveMap (map: readonly string[]): void
{
    validateMap(map, 'mapa activo');

    activeMap = map;
}

export function getActiveMap (): readonly string[]
{
    return activeMap;
}

export function isValidCell (cell: Cell): boolean
{
    return cell.col >= 0 && cell.col < GRID_COLUMNS && cell.row >= 0 && cell.row < GRID_ROWS;
}

export function isWalkable (cell: Cell): boolean
{
    return isValidCell(cell) && activeMap[cell.row][cell.col] !== '#';
}

export function cellToWorld (cell: Cell): { x: number; y: number }
{
    return {
        x: GRID_X + cell.col * CELL_SIZE + CELL_SIZE / 2,
        y: GRID_Y + cell.row * CELL_SIZE + CELL_SIZE / 2
    };
}

export function worldToCell (x: number, y: number): Cell | null
{
    const cell: Cell = {
        col: Math.floor((x - GRID_X) / CELL_SIZE),
        row: Math.floor((y - GRID_Y) / CELL_SIZE)
    };

    return isValidCell(cell) ? cell : null;
}

export function cellKey (cell: Cell): string
{
    return `${cell.col},${cell.row}`;
}

export function cellsEqual (a: Cell, b: Cell): boolean
{
    return a.col === b.col && a.row === b.row;
}
