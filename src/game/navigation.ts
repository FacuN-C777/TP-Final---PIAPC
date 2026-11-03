import {
    CELL_SIZE,
    cellToWorld,
    isWalkable,
    worldToCell,
    type Cell
} from './grid';

export type NavigationMode = 'cells' | 'smooth';

const LINE_SAMPLE_STEP = CELL_SIZE / 8;

export function hasLineOfSight (from: Cell, to: Cell): boolean
{
    const start = cellToWorld(from);
    const end = cellToWorld(to);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.hypot(dx, dy);
    const samples = Math.max(1, Math.ceil(distance / LINE_SAMPLE_STEP));

    let previous: Cell | null = null;

    for (let index = 0; index <= samples; index++)
    {
        const ratio = index / samples;
        const x = start.x + dx * ratio;
        const y = start.y + dy * ratio;
        const cell = worldToCell(x, y);

        if (!cell || !isWalkable(cell))
        {
            return false;
        }

        if (previous && cell.col !== previous.col && cell.row !== previous.row)
        {
            const sideA: Cell = { col: cell.col, row: previous.row };
            const sideB: Cell = { col: previous.col, row: cell.row };

            if (!isWalkable(sideA) || !isWalkable(sideB))
            {
                return false;
            }
        }

        previous = cell;
    }

    return true;
}

export function buildWaypoints (path: Cell[], mode: NavigationMode): Cell[]
{
    if (path.length === 0)
    {
        return [];
    }

    if (mode === 'cells' || path.length <= 2)
    {
        return path;
    }

    const waypoints: Cell[] = [path[0]];
    let anchor = 0;

    while (anchor < path.length - 1)
    {
        let next = path.length - 1;

        while (next > anchor + 1 && !hasLineOfSight(path[anchor], path[next]))
        {
            next--;
        }

        waypoints.push(path[next]);
        anchor = next;
    }

    return waypoints;
}
