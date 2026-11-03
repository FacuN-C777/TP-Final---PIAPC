import { cellsEqual, type Cell } from './grid';
import { hasLineOfSight } from './navigation';

export const VISION_RANGE = 5;
export const VISION_HALF_ANGLE = 45;
export const HEARING_RANGE = 6;

const ANGLE_EPSILON = 1e-6;

export type NoiseKind = 'door' | 'treasure';

export interface Direction
{
    readonly col: number;
    readonly row: number;
}

export interface NoiseEvent
{
    readonly origin: Cell;
    readonly kind: NoiseKind;
    readonly at: number;
}

export interface GuardPerception
{
    readonly cell: Cell;
    facing: Direction;
    seesThief: boolean;
    lastKnownPosition: Cell | null;
    lastNoise: NoiseEvent | null;
}

export function createGuardPerception (cell: Cell, facing: Direction): GuardPerception
{
    return {
        cell: { col: cell.col, row: cell.row },
        facing: { col: facing.col, row: facing.row },
        seesThief: false,
        lastKnownPosition: null,
        lastNoise: null
    };
}

export function initialFacing (guard: Cell, target: Cell): Direction
{
    const deltaCol = target.col - guard.col;
    const deltaRow = target.row - guard.row;

    if (deltaCol === 0 && deltaRow === 0)
    {
        return { col: 1, row: 0 };
    }

    if (Math.abs(deltaCol) >= Math.abs(deltaRow))
    {
        return { col: Math.sign(deltaCol), row: 0 };
    }

    return { col: 0, row: Math.sign(deltaRow) };
}

export function cellDistance (a: Cell, b: Cell): number
{
    return Math.hypot(a.col - b.col, a.row - b.row);
}

export function facingAngleTo (facing: Direction, from: Cell, to: Cell): number
{
    const facingLength = Math.hypot(facing.col, facing.row);
    const deltaCol = to.col - from.col;
    const deltaRow = to.row - from.row;
    const distance = Math.hypot(deltaCol, deltaRow);

    if (facingLength === 0 || distance === 0)
    {
        return 0;
    }

    const dot = (facing.col * deltaCol + facing.row * deltaRow) / (facingLength * distance);
    const clamped = Math.max(-1, Math.min(1, dot));

    return (Math.acos(clamped) * 180) / Math.PI;
}

export function isWithinVisionCone (guard: Cell, facing: Direction, target: Cell): boolean
{
    const distance = cellDistance(guard, target);

    if (distance > VISION_RANGE)
    {
        return false;
    }

    if (distance === 0)
    {
        return true;
    }

    return facingAngleTo(facing, guard, target) <= VISION_HALF_ANGLE + ANGLE_EPSILON;
}

export function canSeeThief (
    guard: Cell,
    facing: Direction,
    thief: Cell,
    thiefHidden: boolean
): boolean
{
    if (thiefHidden)
    {
        return false;
    }

    if (!isWithinVisionCone(guard, facing, thief))
    {
        return false;
    }

    if (cellsEqual(guard, thief))
    {
        return true;
    }

    return hasLineOfSight(guard, thief);
}

export function updateGuardVision (
    perception: GuardPerception,
    thief: Cell,
    thiefHidden: boolean
): boolean
{
    perception.seesThief = canSeeThief(perception.cell, perception.facing, thief, thiefHidden);

    if (perception.seesThief)
    {
        perception.lastKnownPosition = { col: thief.col, row: thief.row };
    }

    return perception.seesThief;
}

export function canHear (guard: Cell, noise: NoiseEvent): boolean
{
    return cellDistance(guard, noise.origin) <= HEARING_RANGE;
}

export function applyNoise (perception: GuardPerception, noise: NoiseEvent): boolean
{
    if (!canHear(perception.cell, noise))
    {
        return false;
    }

    perception.lastNoise = noise;

    return true;
}

export function hasRecentNoise (
    perception: GuardPerception,
    now: number,
    windowMs: number
): boolean
{
    return perception.lastNoise !== null && now - perception.lastNoise.at <= windowMs;
}

export function isHidingCell (cell: Cell, hidingSpots: readonly Cell[]): boolean
{
    return hidingSpots.some((spot) => cellsEqual(spot, cell));
}
