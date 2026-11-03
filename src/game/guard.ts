import { cellsEqual, type Cell } from './grid';
import type { GuardPerception } from './perception';

export type GuardState = 'PATRULLA' | 'INVESTIGAR' | 'PERSEGUIR';

export const GUARD_OBSERVE_MS = 2000;

export interface GuardAgent
{
    readonly perception: GuardPerception;
    state: GuardState;
    destination: Cell | null;
    path: Cell[];
    waypoints: Cell[];
    waypointIndex: number;
    moving: boolean;
    observeUntil: number;
    handledNoiseAt: number;
    pendingInvestigation: Cell | null;
}

export interface GuardUpdateContext
{
    readonly now: number;
    readonly thiefCell: Cell;
    readonly reachableCells: readonly Cell[];
    readonly random: () => number;
}

export type GuardAction =
    | { readonly type: 'idle' }
    | { readonly type: 'move'; readonly destination: Cell; readonly reason: GuardState }
    | { readonly type: 'observe'; readonly until: number };

export function createGuardAgent (perception: GuardPerception): GuardAgent
{
    return {
        perception,
        state: 'PATRULLA',
        destination: null,
        path: [],
        waypoints: [],
        waypointIndex: 0,
        moving: false,
        observeUntil: 0,
        handledNoiseAt: -1,
        pendingInvestigation: null
    };
}

export function choosePatrolDestination (
    current: Cell,
    reachableCells: readonly Cell[],
    random: () => number = Math.random
): Cell | null
{
    const candidates = reachableCells.filter((cell) => !cellsEqual(cell, current));

    if (candidates.length === 0)
    {
        return null;
    }

    const index = Math.min(
        Math.floor(random() * candidates.length),
        candidates.length - 1
    );
    const destination = candidates[index];

    return { col: destination.col, row: destination.row };
}

function beginMove (agent: GuardAgent, destination: Cell, state: GuardState): GuardAction
{
    agent.state = state;
    agent.destination = { col: destination.col, row: destination.row };
    agent.observeUntil = 0;

    return { type: 'move', destination: agent.destination, reason: state };
}

function beginObserve (agent: GuardAgent, now: number): GuardAction
{
    agent.observeUntil = now + GUARD_OBSERVE_MS;

    return { type: 'observe', until: agent.observeUntil };
}

export function updateGuardAgent (agent: GuardAgent, context: GuardUpdateContext): GuardAction
{
    const { now, thiefCell, reachableCells, random } = context;
    const perception = agent.perception;

    if (perception.seesThief)
    {
        agent.state = 'PERSEGUIR';
        agent.observeUntil = 0;
        agent.pendingInvestigation = null;

        if (perception.lastNoise && perception.lastNoise.at > agent.handledNoiseAt)
        {
            agent.handledNoiseAt = perception.lastNoise.at;
        }

        if (!agent.destination || !cellsEqual(agent.destination, thiefCell))
        {
            return beginMove(agent, thiefCell, 'PERSEGUIR');
        }

        return { type: 'idle' };
    }

    if (agent.state === 'PERSEGUIR')
    {
        agent.state = 'INVESTIGAR';
        agent.destination = null;
        agent.observeUntil = 0;
        agent.pendingInvestigation = perception.lastKnownPosition
            ? { col: perception.lastKnownPosition.col, row: perception.lastKnownPosition.row }
            : null;
    }

    const noise = perception.lastNoise;

    if (noise && noise.at > agent.handledNoiseAt)
    {
        agent.handledNoiseAt = noise.at;
        agent.state = 'INVESTIGAR';
        agent.destination = null;
        agent.observeUntil = 0;
        agent.pendingInvestigation = { col: noise.origin.col, row: noise.origin.row };
    }

    if (agent.state === 'INVESTIGAR')
    {
        if (agent.pendingInvestigation)
        {
            const target = agent.pendingInvestigation;

            agent.pendingInvestigation = null;
            agent.destination = null;

            if (cellsEqual(target, perception.cell))
            {
                agent.destination = { col: target.col, row: target.row };

                return beginObserve(agent, now);
            }

            return beginMove(agent, target, 'INVESTIGAR');
        }

        if (agent.moving)
        {
            return { type: 'idle' };
        }

        if (agent.destination)
        {
            if (agent.observeUntil === 0)
            {
                return beginObserve(agent, now);
            }

            if (now < agent.observeUntil)
            {
                return { type: 'observe', until: agent.observeUntil };
            }

            agent.state = 'PATRULLA';
            agent.destination = null;
            agent.observeUntil = 0;
        }
        else
        {
            agent.state = 'PATRULLA';
            agent.observeUntil = 0;
        }
    }

    if (agent.state === 'PATRULLA')
    {
        if (agent.moving)
        {
            return { type: 'idle' };
        }

        const destination = choosePatrolDestination(perception.cell, reachableCells, random);

        if (!destination)
        {
            return { type: 'idle' };
        }

        return beginMove(agent, destination, 'PATRULLA');
    }

    return { type: 'idle' };
}
