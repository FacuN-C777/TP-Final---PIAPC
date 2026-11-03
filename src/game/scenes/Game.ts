import { Scene } from 'phaser';
import type { GameObjects, Input, Time, Tweens } from 'phaser';
import {
    CELL_SIZE,
    GRID_COLUMNS,
    GRID_HEIGHT,
    GRID_ROWS,
    GRID_WIDTH,
    GRID_X,
    GRID_Y,
    cellKey,
    cellToWorld,
    cellsEqual,
    getActiveMap,
    isWalkable,
    setActiveMap,
    worldToCell,
    type Cell
} from '../grid';
import { findGuardPath, findPath, type SearchAlgorithm } from '../pathfinding';
import { buildWaypoints, type NavigationMode } from '../navigation';
import {
    HEARING_RANGE,
    VISION_HALF_ANGLE,
    VISION_RANGE,
    applyNoise,
    createGuardPerception,
    hasRecentNoise,
    initialFacing,
    isHidingCell,
    updateGuardVision,
    type NoiseEvent,
    type NoiseKind
} from '../perception';
import {
    createGuardAgent,
    updateGuardAgent,
    type GuardAgent,
    type GuardState
} from '../guard';
import { generateScenario, type GuardCount, type Scenario } from '../scenario';

const MOVE_SPEED = 5;
const GUARD_MOVE_SPEED = 4;
const NOISE_NOTICE_MS = 1600;
const NOISE_REDRAW_DELAY = NOISE_NOTICE_MS + 100;

const GUARD_STATE_LABELS: Record<GuardState, string> = {
    PATRULLA: 'P',
    INVESTIGAR: 'I',
    PERSEGUIR: 'PE'
};

const NEIGHBOR_OFFSETS: readonly Cell[] = [
    { col: 0, row: -1 },
    { col: 1, row: 0 },
    { col: 0, row: 1 },
    { col: -1, row: 0 }
];

interface MarkerParts
{
    readonly shape: GameObjects.Arc | GameObjects.Rectangle;
    readonly label: GameObjects.Text;
}

interface TreasureMarker
{
    readonly cell: Cell;
    readonly parts: MarkerParts;
}

const COLORS = {
    floor: 0x2f333b,
    wall: 0x59606d,
    wallEdge: 0x7a8291,
    gridLine: 0x1c1f25,
    route: 0x5ad1ff,
    ladron: 0xf2c14e,
    key: 0xffd166,
    door: 0x9c6b3f,
    treasure: 0xff9f43,
    exit: 0x7ee787,
    hiding: 0xb388ff,
    guard: 0xff5c5c,
    vision: 0x4dd6a8,
    visionAlert: 0xff5c5c,
    hearing: 0x8a9bff,
    lastKnown: 0xffd166,
    noise: 0xffa94d
};

export class Game extends Scene
{
    private algorithm: SearchAlgorithm = 'BFS';
    private navigationMode: NavigationMode = 'cells';
    private guardCount: GuardCount = 1;
    private routeVisible = true;
    private scenario!: Scenario;
    private ladron!: GameObjects.Arc;
    private ladronCell: Cell = { col: 1, row: 1 };
    private currentPath: Cell[] = [];
    private waypoints: Cell[] = [];
    private waypointIndex = 0;
    private pathIndex = 0;
    private moving = false;
    private hasKey = false;
    private doorOpen = false;
    private gameWon = false;
    private gameLost = false;
    private treasuresCollected = 0;
    private collectedTreasures = new Set<string>();
    private treasureMarkers: TreasureMarker[] = [];
    private keyMarker!: MarkerParts;
    private doorMarker!: MarkerParts;
    private guardAgents: GuardAgent[] = [];
    private guardMarkers: MarkerParts[] = [];
    private guardReachableCells: Cell[] = [];
    private lastPerceptionCellKey = '';
    private perceptionGraphics!: GameObjects.Graphics;
    private noiseMarker!: GameObjects.Arc;
    private noiseLabel!: GameObjects.Text;
    private noiseRedrawTimer?: Time.TimerEvent;
    private detectionBadge!: GameObjects.Text;
    private guardStateBadge!: GameObjects.Text;
    private routeGraphics!: GameObjects.Graphics;
    private algorithmLabel!: GameObjects.Text;
    private algorithmBadge!: GameObjects.Text;
    private navigationLabel!: GameObjects.Text;
    private navigationBadge!: GameObjects.Text;
    private keyBadge!: GameObjects.Text;
    private doorBadge!: GameObjects.Text;
    private treasureBadge!: GameObjects.Text;
    private guardButton!: GameObjects.Text;
    private controlsText!: GameObjects.Text;
    private messageText!: GameObjects.Text;
    private messageTimer?: Time.TimerEvent;

    constructor ()
    {
        super('Game');
    }

    init ()
    {
        this.algorithm = 'BFS';
        this.navigationMode = 'cells';
        this.routeVisible = true;
        this.currentPath = [];
        this.waypoints = [];
        this.waypointIndex = 0;
        this.pathIndex = 0;
        this.moving = false;
        this.hasKey = false;
        this.doorOpen = false;
        this.gameWon = false;
        this.gameLost = false;
        this.treasuresCollected = 0;
        this.collectedTreasures = new Set<string>();
        this.treasureMarkers = [];
        this.guardAgents = [];
        this.guardMarkers = [];
        this.guardReachableCells = [];
        this.lastPerceptionCellKey = '';
        this.noiseRedrawTimer = undefined;
        this.messageTimer = undefined;
    }

    create ()
    {
        this.scenario = generateScenario({ guardCount: this.guardCount });
        setActiveMap(this.scenario.map);

        this.ladronCell = this.scenario.start;

        this.cameras.main.setBackgroundColor(0x111318);

        this.drawGrid();
        this.drawScenarioElements();

        this.perceptionGraphics = this.add.graphics().setDepth(2.5);

        this.noiseMarker = this.add.circle(0, 0, CELL_SIZE * 0.45, COLORS.noise, 0.18)
            .setStrokeStyle(2, COLORS.noise, 0.9)
            .setVisible(false)
            .setDepth(2.6);

        this.noiseLabel = this.add.text(0, 0, 'Ruido', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '12px',
            color: '#ffd7a8'
        }).setOrigin(0.5).setVisible(false).setDepth(2.7);

        this.routeGraphics = this.add.graphics().setDepth(3);

        const start = cellToWorld(this.ladronCell);

        this.ladron = this.add.circle(start.x, start.y, CELL_SIZE * 0.28, COLORS.ladron)
            .setStrokeStyle(2, 0x111318, 1)
            .setDepth(4);

        this.createGuardAgents();
        this.drawHud();
        this.refreshPerception();

        this.input.on('pointerdown', (pointer: Input.Pointer) => {
            this.handlePointerDown(pointer);
        });

        this.input.keyboard?.on('keydown-ONE', () => {
            this.setAlgorithm('BFS');
        });

        this.input.keyboard?.on('keydown-TWO', () => {
            this.setAlgorithm('DFS');
        });

        this.input.keyboard?.on('keydown-THREE', () => {
            this.setAlgorithm('A*');
        });

        this.input.keyboard?.on('keydown-N', () => {
            this.toggleNavigation();
        });

        this.input.keyboard?.on('keydown-P', () => {
            this.toggleRoute();
        });

        this.input.keyboard?.on('keydown-R', () => {
            this.scene.restart();
        });
    }

    update ()
    {
        if (this.gameWon || this.gameLost)
        {
            return;
        }

        this.guardAgents.forEach((agent, index) => {
            this.stepGuard(agent, index);
        });
    }

    private drawGrid ()
    {
        const graphics = this.add.graphics();
        const map = getActiveMap();

        graphics.fillStyle(COLORS.floor, 1);
        graphics.fillRect(GRID_X, GRID_Y, GRID_WIDTH, GRID_HEIGHT);

        graphics.lineStyle(1, COLORS.gridLine, 1);

        for (let column = 0; column <= GRID_COLUMNS; column++)
        {
            const x = GRID_X + column * CELL_SIZE;
            graphics.lineBetween(x, GRID_Y, x, GRID_Y + GRID_HEIGHT);
        }

        for (let row = 0; row <= GRID_ROWS; row++)
        {
            const y = GRID_Y + row * CELL_SIZE;
            graphics.lineBetween(GRID_X, y, GRID_X + GRID_WIDTH, y);
        }

        for (let row = 0; row < GRID_ROWS; row++)
        {
            const cells = map[row];

            for (let column = 0; column < GRID_COLUMNS; column++)
            {
                if (cells[column] !== '#')
                {
                    continue;
                }

                const x = GRID_X + column * CELL_SIZE;
                const y = GRID_Y + row * CELL_SIZE;

                graphics.fillStyle(COLORS.wall, 1);
                graphics.fillRect(x, y, CELL_SIZE, CELL_SIZE);
                graphics.lineStyle(1, COLORS.wallEdge, 0.6);
                graphics.strokeRect(x + 0.5, y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);
            }
        }

        graphics.lineStyle(2, COLORS.wallEdge, 1);
        graphics.strokeRect(GRID_X, GRID_Y, GRID_WIDTH, GRID_HEIGHT);
    }

    private drawScenarioElements ()
    {
        this.doorMarker = this.addScenarioMarker(
            this.scenario.door, COLORS.door, 'P', 'square', CELL_SIZE * 0.92, 1
        );

        this.keyMarker = this.addScenarioMarker(
            this.scenario.key, COLORS.key, 'L', 'circle', CELL_SIZE * 0.5
        );
        this.addScenarioMarker(this.scenario.exit, COLORS.exit, 'S', 'square', CELL_SIZE * 0.72);

        this.treasureMarkers = this.scenario.treasures.map((treasure) => ({
            cell: treasure,
            parts: this.addScenarioMarker(treasure, COLORS.treasure, 'T', 'square', CELL_SIZE * 0.58)
        }));

        this.scenario.hidingSpots.forEach((hidingSpot) => {
            this.addScenarioMarker(hidingSpot, COLORS.hiding, 'E', 'circle', CELL_SIZE * 0.58, 0.65);
        });

        this.guardMarkers = this.scenario.guards.map((guard) => {
            return this.addScenarioMarker(guard, COLORS.guard, 'G', 'circle', CELL_SIZE * 0.62);
        });
    }

    private addScenarioMarker (
        cell: Cell,
        color: number,
        label: string,
        shape: 'square' | 'circle',
        size: number,
        alpha = 0.85
    ): MarkerParts
    {
        const position = cellToWorld(cell);
        const marker: GameObjects.Arc | GameObjects.Rectangle = shape === 'circle'
            ? this.add.circle(position.x, position.y, size / 2, color, alpha)
            : this.add.rectangle(position.x, position.y, size, size, color, alpha);

        marker.setStrokeStyle(2, 0x111318, 0.9).setDepth(1);

        const text = this.add.text(position.x, position.y, label, {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '16px',
            color: '#111318'
        }).setOrigin(0.5).setDepth(2);

        return { shape: marker, label: text };
    }

    private createGuardAgents ()
    {
        this.guardAgents = this.scenario.guards.map((guard) => {
            const perception = createGuardPerception(guard, initialFacing(guard, this.ladronCell));

            return createGuardAgent(perception);
        });

        this.guardReachableCells = this.collectGuardReachableCells();
    }

    private collectGuardReachableCells (): Cell[]
    {
        const start = this.ladronCell;
        const visited = new Set<string>([cellKey(start)]);
        const queue: Cell[] = [start];
        let head = 0;

        while (head < queue.length)
        {
            const current = queue[head];
            head++;

            for (const offset of NEIGHBOR_OFFSETS)
            {
                const neighbor: Cell = {
                    col: current.col + offset.col,
                    row: current.row + offset.row
                };
                const key = cellKey(neighbor);

                if (visited.has(key))
                {
                    continue;
                }

                if (!isWalkable(neighbor) && !cellsEqual(neighbor, this.scenario.door))
                {
                    continue;
                }

                visited.add(key);
                queue.push(neighbor);
            }
        }

        return queue.filter((cell) => {
            return isWalkable(cell) && !cellsEqual(cell, this.scenario.door);
        });
    }

    private refreshPerception ()
    {
        const thiefCell = this.getCurrentCell();
        const thiefHidden = isHidingCell(thiefCell, this.scenario.hidingSpots);

        this.guardAgents.forEach((agent) => {
            updateGuardVision(agent.perception, thiefCell, thiefHidden);
        });

        this.lastPerceptionCellKey = cellKey(thiefCell);

        this.drawPerception();
        this.updateHud();
        this.checkDefeat();
    }

    private trackLadronCellChange ()
    {
        const thiefCell = this.getCurrentCell();

        if (cellKey(thiefCell) === this.lastPerceptionCellKey)
        {
            return;
        }

        this.refreshPerception();
    }

    private drawPerception ()
    {
        const graphics = this.perceptionGraphics;

        if (!graphics)
        {
            return;
        }

        graphics.clear();

        const thiefCell = this.getCurrentCell();
        const thiefPosition = cellToWorld(thiefCell);
        const now = this.time.now;
        const halfAngle = (VISION_HALF_ANGLE * Math.PI) / 180;

        this.guardAgents.forEach((agent, index) => {
            const perception = agent.perception;
            const guardPosition = cellToWorld(perception.cell);
            const facingAngle = Math.atan2(perception.facing.row, perception.facing.col);
            const recentNoise = hasRecentNoise(perception, now, NOISE_NOTICE_MS);
            const coneColor = perception.seesThief ? COLORS.visionAlert : COLORS.vision;

            graphics.lineStyle(1.5, COLORS.hearing, 0.28);
            graphics.strokeCircle(guardPosition.x, guardPosition.y, HEARING_RANGE * CELL_SIZE);

            graphics.fillStyle(coneColor, perception.seesThief ? 0.16 : 0.09);
            graphics.slice(
                guardPosition.x,
                guardPosition.y,
                VISION_RANGE * CELL_SIZE,
                facingAngle - halfAngle,
                facingAngle + halfAngle,
                false
            );
            graphics.fillPath();

            graphics.lineStyle(1.5, coneColor, perception.seesThief ? 0.75 : 0.4);
            graphics.strokePath();

            if (perception.seesThief)
            {
                graphics.lineStyle(2, COLORS.visionAlert, 0.8);
                graphics.lineBetween(
                    guardPosition.x,
                    guardPosition.y,
                    thiefPosition.x,
                    thiefPosition.y
                );
            }

            if (perception.lastKnownPosition)
            {
                const known = cellToWorld(perception.lastKnownPosition);
                const size = CELL_SIZE * 0.3;

                graphics.lineStyle(2, COLORS.lastKnown, 0.85);
                graphics.strokeRect(known.x - size, known.y - size, size * 2, size * 2);
                graphics.lineBetween(known.x - size, known.y - size, known.x + size, known.y + size);
                graphics.lineBetween(known.x + size, known.y - size, known.x - size, known.y + size);
            }

            const marker = this.guardMarkers[index];

            if (marker)
            {
                if (perception.seesThief)
                {
                    marker.shape.setStrokeStyle(3, 0xffffff, 1);
                }
                else if (recentNoise)
                {
                    marker.shape.setStrokeStyle(3, COLORS.noise, 1);
                }
                else
                {
                    marker.shape.setStrokeStyle(2, 0x111318, 0.9);
                }
            }
        });
    }

    private emitNoise (origin: Cell, kind: NoiseKind)
    {
        const noise: NoiseEvent = {
            origin: { col: origin.col, row: origin.row },
            kind,
            at: this.time.now
        };

        this.guardAgents.forEach((agent) => {
            applyNoise(agent.perception, noise);
        });

        this.showNoiseNotice(origin);

        this.noiseRedrawTimer?.remove(false);
        this.noiseRedrawTimer = this.time.delayedCall(NOISE_REDRAW_DELAY, () => {
            this.noiseRedrawTimer = undefined;
            this.drawPerception();
            this.updateHud();
        });

        this.drawPerception();
        this.updateHud();
    }

    private showNoiseNotice (origin: Cell)
    {
        const position = cellToWorld(origin);

        this.tweens.killTweensOf([ this.noiseMarker, this.noiseLabel ]);

        this.noiseMarker.setPosition(position.x, position.y).setAlpha(1).setVisible(true);
        this.noiseLabel.setPosition(position.x, position.y - CELL_SIZE * 0.55).setAlpha(1).setVisible(true);

        this.tweens.add({
            targets: [ this.noiseMarker, this.noiseLabel ],
            alpha: 0,
            duration: NOISE_NOTICE_MS,
            onComplete: () => {
                this.noiseMarker.setVisible(false);
                this.noiseLabel.setVisible(false);
            }
        });
    }

    private drawHud ()
    {
        this.add.text(512, 20, 'Asecho Nocturno', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '28px',
            color: '#f4f1e8'
        }).setOrigin(0.5).setDepth(10);

        this.algorithmLabel = this.add.text(0, 50, 'Búsqueda actual:', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '15px',
            color: '#aab2c0'
        }).setOrigin(0, 0.5).setDepth(10);

        this.algorithmBadge = this.add.text(0, 50, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#111318',
            backgroundColor: '#7ee787',
            padding: { left: 10, right: 10, top: 1, bottom: 1 }
        }).setOrigin(0, 0.5).setDepth(10);

        this.navigationLabel = this.add.text(0, 70, 'Navegación actual:', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '15px',
            color: '#aab2c0'
        }).setOrigin(0, 0.5).setDepth(10);

        this.navigationBadge = this.add.text(0, 70, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '16px',
            fontStyle: 'bold',
            color: '#111318',
            backgroundColor: '#7cc6ff',
            padding: { left: 10, right: 10, top: 1, bottom: 1 }
        }).setOrigin(0, 0.5).setDepth(10);

        this.keyBadge = this.add.text(14, 50, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#e6e9ef',
            backgroundColor: '#59606d',
            padding: { left: 8, right: 8, top: 2, bottom: 2 }
        }).setOrigin(0, 0.5).setDepth(10);

        this.doorBadge = this.add.text(14, 70, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#111318',
            backgroundColor: '#ffb4a2',
            padding: { left: 8, right: 8, top: 2, bottom: 2 }
        }).setOrigin(0, 0.5).setDepth(10);

        this.detectionBadge = this.add.text(14, 30, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#e6e9ef',
            backgroundColor: '#59606d',
            padding: { left: 8, right: 8, top: 2, bottom: 2 }
        }).setOrigin(0, 0.5).setDepth(10);

        this.guardStateBadge = this.add.text(1004, 30, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '12px',
            fontStyle: 'bold',
            color: '#111318',
            backgroundColor: '#ffb4a2',
            padding: { left: 8, right: 8, top: 2, bottom: 2 }
        }).setOrigin(1, 0.5).setDepth(10);

        this.treasureBadge = this.add.text(1004, 70, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#111318',
            backgroundColor: '#ff9f43',
            padding: { left: 8, right: 8, top: 2, bottom: 2 }
        }).setOrigin(1, 0.5).setDepth(10);

        this.guardButton = this.add.text(1004, 50, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '15px',
            fontStyle: 'bold',
            color: '#111318',
            backgroundColor: '#ffb4a2',
            padding: { left: 10, right: 10, top: 2, bottom: 2 }
        }).setOrigin(1, 0.5).setDepth(10).setInteractive({ useHandCursor: true });

        this.guardButton.on('pointerdown', () => {
            this.guardCount = this.guardCount === 1 ? 2 : 1;
            this.scene.restart();
        });

        this.controlsText = this.add.text(512, 88, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '13px',
            color: '#aab2c0'
        }).setOrigin(0.5).setDepth(10);

        this.messageText = this.add.text(512, 744, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '16px',
            color: '#ffb4a2'
        }).setOrigin(0.5).setDepth(10);

        this.updateHud();
    }

    private updateHud ()
    {
        const routeState = this.routeVisible ? 'visible' : 'oculta';
        const gap = 8;

        this.algorithmBadge.setText(this.algorithm);
        this.navigationBadge.setText(this.navigationMode === 'cells' ? 'Por celdas' : 'Suavizada');
        this.guardButton.setText(`Guardias: ${this.guardCount}`);

        this.keyBadge.setText(this.hasKey ? 'Llave: sí' : 'Llave: no');
        this.doorBadge.setText(this.doorOpen ? 'Puerta: abierta' : 'Puerta: cerrada');
        this.treasureBadge.setText(`Tesoros: ${this.treasuresCollected} / ${this.scenario.treasures.length}`);

        const anySees = this.guardAgents.some((agent) => agent.perception.seesThief);
        const anyNoise = this.guardAgents.some((agent) => {
            return hasRecentNoise(agent.perception, this.time.now, NOISE_NOTICE_MS);
        });

        if (anySees)
        {
            this.detectionBadge.setText('Detección: vista');
            this.detectionBadge.setBackgroundColor('#ff5c5c');
            this.detectionBadge.setColor('#111318');
        }
        else if (anyNoise)
        {
            this.detectionBadge.setText('Detección: ruido');
            this.detectionBadge.setBackgroundColor('#ffa94d');
            this.detectionBadge.setColor('#111318');
        }
        else
        {
            this.detectionBadge.setText('Detección: no');
            this.detectionBadge.setBackgroundColor('#59606d');
            this.detectionBadge.setColor('#e6e9ef');
        }

        const guardStates = this.guardAgents.map((agent) => {
            return GUARD_STATE_LABELS[agent.state];
        });

        this.guardStateBadge.setText(`Guardias: ${guardStates.join(' · ')}`);

        if (this.guardAgents.some((agent) => agent.state === 'PERSEGUIR'))
        {
            this.guardStateBadge.setBackgroundColor('#ff5c5c');
            this.guardStateBadge.setColor('#111318');
        }
        else if (this.guardAgents.some((agent) => agent.state === 'INVESTIGAR'))
        {
            this.guardStateBadge.setBackgroundColor('#ffa94d');
            this.guardStateBadge.setColor('#111318');
        }
        else
        {
            this.guardStateBadge.setBackgroundColor('#7ee787');
            this.guardStateBadge.setColor('#111318');
        }

        const algorithmWidth = this.algorithmLabel.width + gap + this.algorithmBadge.width;
        const algorithmStartX = 512 - algorithmWidth / 2;

        this.algorithmLabel.setPosition(algorithmStartX, 50);
        this.algorithmBadge.setPosition(algorithmStartX + this.algorithmLabel.width + gap, 50);

        const navigationWidth = this.navigationLabel.width + gap + this.navigationBadge.width;
        const navigationStartX = 512 - navigationWidth / 2;

        this.navigationLabel.setPosition(navigationStartX, 70);
        this.navigationBadge.setPosition(navigationStartX + this.navigationLabel.width + gap, 70);

        if (this.doorOpen)
        {
            this.doorBadge.setBackgroundColor('#7ee787');
            this.doorBadge.setColor('#111318');
        }
        else
        {
            this.doorBadge.setBackgroundColor('#ffb4a2');
            this.doorBadge.setColor('#111318');
        }

        if (this.hasKey)
        {
            this.keyBadge.setBackgroundColor('#ffd166');
            this.keyBadge.setColor('#111318');
        }
        else
        {
            this.keyBadge.setBackgroundColor('#59606d');
            this.keyBadge.setColor('#e6e9ef');
        }

        this.controlsText.setText(
            `Ruta: ${routeState}  |  1 BFS · 2 DFS · 3 A*  |  N: navegación  |  P: ruta  |  R: nueva partida`
        );
    }

    private setAlgorithm (algorithm: SearchAlgorithm)
    {
        this.algorithm = algorithm;
        this.updateHud();
    }

    private toggleNavigation ()
    {
        this.navigationMode = this.navigationMode === 'cells' ? 'smooth' : 'cells';

        if (this.moving && this.currentPath.length > 1)
        {
            const destination = this.currentPath[this.currentPath.length - 1];
            const origin = this.getCurrentCell();

            this.cancelMovement(origin);

            const path = findPath(origin, destination, this.algorithm);

            if (path && path.length > 1)
            {
                this.startPath(path);
            }
        }

        this.updateHud();
        this.drawRoute();
    }

    private toggleRoute ()
    {
        this.routeVisible = !this.routeVisible;
        this.drawRoute();
        this.updateHud();
    }

    private handlePointerDown (pointer: Input.Pointer)
    {
        if (pointer.y < GRID_Y || this.gameWon || this.gameLost)
        {
            return;
        }

        const target = worldToCell(pointer.x, pointer.y);

        if (!target)
        {
            this.showMessage('Clic inválido: fuera de la grilla.');
            return;
        }

        if (!this.doorOpen && cellsEqual(target, this.scenario.door))
        {
            if (!this.hasKey)
            {
                this.showMessage('La puerta está cerrada. Necesitás la llave.');
                return;
            }

            this.openDoor();
        }

        if (!isWalkable(target))
        {
            this.showMessage('Clic inválido: esa celda es una pared.');
            return;
        }

        const origin = this.getCurrentCell();

        if (cellsEqual(origin, target))
        {
            this.showMessage('Ya estás en esa celda.');
            return;
        }

        let path = findPath(origin, target, this.algorithm);

        if (!path && !this.doorOpen && this.hasKey)
        {
            this.openDoor();
            path = findPath(origin, target, this.algorithm);
        }

        if (!path)
        {
            this.showMessage('Clic inválido: no hay camino hasta esa celda.');
            return;
        }

        if (this.moving)
        {
            this.cancelMovement(origin);
        }

        this.ladronCell = origin;
        this.startPath(path);
    }

    private startPath (path: Cell[])
    {
        this.currentPath = path;
        this.waypoints = buildWaypoints(path, this.navigationMode);
        this.waypointIndex = 1;
        this.pathIndex = 0;
        this.moving = true;

        this.drawRoute();
        this.moveToNextWaypoint();
    }

    private openDoor ()
    {
        if (this.doorOpen)
        {
            return;
        }

        const { col, row } = this.scenario.door;
        const updatedRow = this.scenario.map[row].split('');

        updatedRow[col] = '.';
        this.scenario.map[row] = updatedRow.join('');
        setActiveMap(this.scenario.map);

        this.doorOpen = true;

        this.doorMarker.shape.setFillStyle(COLORS.exit, 0.35);
        this.doorMarker.shape.setStrokeStyle(2, COLORS.exit, 0.9);
        this.doorMarker.label.setText('A').setColor('#c9ffd3');

        this.showMessage('Abriste la puerta.');
        this.refreshPerception();
        this.emitNoise(this.scenario.door, 'door');
        this.updateHud();
    }

    private findPathIndex (cell: Cell): number
    {
        for (let index = this.pathIndex; index < this.currentPath.length; index++)
        {
            if (cellsEqual(this.currentPath[index], cell))
            {
                return index;
            }
        }

        return -1;
    }

    private resolveTraversedCells (upToIndex: number)
    {
        if (upToIndex < 0)
        {
            return;
        }

        for (let index = this.pathIndex + 1; index <= upToIndex; index++)
        {
            this.resolveCell(this.currentPath[index]);

            if (this.gameWon || this.gameLost)
            {
                return;
            }
        }
    }

    private resolveCell (cell: Cell)
    {
        if (!this.hasKey && cellsEqual(cell, this.scenario.key))
        {
            this.hasKey = true;
            this.keyMarker.shape.setVisible(false);
            this.keyMarker.label.setVisible(false);
            this.showMessage('Recogiste la llave.');
            this.updateHud();
        }

        const treasure = this.scenario.treasures.find((item) => {
            return cellsEqual(item, cell) && !this.collectedTreasures.has(cellKey(item));
        });

        if (treasure)
        {
            const key = cellKey(treasure);
            const marker = this.treasureMarkers.find((item) => cellsEqual(item.cell, treasure));

            this.collectedTreasures.add(key);
            this.treasuresCollected++;
            marker?.parts.shape.setVisible(false);
            marker?.parts.label.setVisible(false);
            this.showMessage(`Tesoro recogido (${this.treasuresCollected} de ${this.scenario.treasures.length}).`);
            this.updateHud();
            this.emitNoise(treasure, 'treasure');
        }

        if (cellsEqual(cell, this.scenario.exit))
        {
            if (this.treasuresCollected > 0)
            {
                this.winGame();
            }
            else
            {
                this.showMessage('Necesitás al menos 1 tesoro para escapar.');
            }
        }
    }

    private winGame ()
    {
        this.gameWon = true;
        this.moving = false;
        this.tweens.killTweensOf(this.ladron);
        this.stopGuardMovement();

        this.currentPath = [];
        this.waypoints = [];
        this.waypointIndex = 0;
        this.pathIndex = 0;
        this.routeGraphics.clear();

        this.showPersistentMessage(
            `¡Victoria! Escapaste con ${this.treasuresCollected} tesoro(s). Presioná R para una nueva partida.`
        );

        this.updateHud();
    }

    private checkDefeat ()
    {
        if (this.gameWon || this.gameLost)
        {
            return;
        }

        const thiefCell = this.getCurrentCell();
        const caught = this.guardAgents.some((agent) => {
            return cellsEqual(agent.perception.cell, thiefCell);
        });

        if (caught)
        {
            this.loseGame();
        }
    }

    private loseGame ()
    {
        if (this.gameWon || this.gameLost)
        {
            return;
        }

        this.gameLost = true;
        this.moving = false;
        this.stopGuardMovement();

        // Diferido: la derrota puede dispararse desde el onUpdate del tween del ladrón.
        this.time.delayedCall(0, () => {
            this.tweens.killTweensOf(this.ladron);
        });

        this.currentPath = [];
        this.waypoints = [];
        this.waypointIndex = 0;
        this.pathIndex = 0;
        this.routeGraphics.clear();

        this.showPersistentMessage(
            'Derrota: un guardia te atrapó. Presioná R para una nueva partida.',
            '#ff5c5c'
        );

        this.updateHud();
    }

    private stopGuardMovement ()
    {
        this.guardAgents.forEach((agent) => {
            agent.moving = false;
            agent.path = [];
            agent.waypoints = [];
            agent.waypointIndex = 0;
        });

        // Se capturan los tweens actuales y se detienen en diferido: esta función puede
        // llamarse desde un callback de tween en curso, y no debe detener tweens nuevos.
        const activeTweens: Tweens.Tween[] = [];

        this.guardMarkers.forEach((marker) => {
            activeTweens.push(...this.tweens.getTweensOf([ marker.shape, marker.label ]));
        });

        this.time.delayedCall(0, () => {
            activeTweens.forEach((tween) => tween.stop());
        });
    }

    private stepGuard (agent: GuardAgent, index: number)
    {
        if (this.gameWon || this.gameLost)
        {
            return;
        }

        this.checkDefeat();

        if (this.gameLost)
        {
            return;
        }

        const previousState = agent.state;
        const action = updateGuardAgent(agent, {
            now: this.time.now,
            thiefCell: this.getCurrentCell(),
            reachableCells: this.guardReachableCells,
            random: Math.random
        });

        if (agent.state !== previousState)
        {
            this.updateHud();
        }

        if (action.type === 'move')
        {
            this.startGuardMove(agent, index, action.destination);
        }
        else if (action.type === 'observe' && agent.moving)
        {
            this.haltGuard(agent, index);
        }
    }

    private haltGuard (agent: GuardAgent, index: number)
    {
        const marker = this.guardMarkers[index];

        agent.moving = false;
        agent.path = [];
        agent.waypoints = [];
        agent.waypointIndex = 0;

        if (!marker)
        {
            return;
        }

        this.tweens.killTweensOf([ marker.shape, marker.label ]);

        const position = cellToWorld(agent.perception.cell);

        marker.shape.setPosition(position.x, position.y);
        marker.label.setPosition(position.x, position.y);
    }

    private startGuardMove (agent: GuardAgent, index: number, destination: Cell)
    {
        const marker = this.guardMarkers[index];

        if (!marker || this.gameWon || this.gameLost)
        {
            return;
        }

        this.tweens.killTweensOf([ marker.shape, marker.label ]);

        const path = findGuardPath(
            agent.perception.cell,
            destination,
            this.algorithm,
            this.scenario.door
        );

        if (!path || path.length <= 1)
        {
            agent.moving = false;
            agent.destination = null;
            agent.path = [];
            agent.waypoints = [];
            agent.waypointIndex = 0;

            return;
        }

        agent.destination = { col: destination.col, row: destination.row };
        agent.path = path;
        agent.waypoints = buildWaypoints(path, this.navigationMode);
        agent.waypointIndex = 1;
        agent.moving = true;

        this.moveGuardToNextWaypoint(agent, index);
    }

    private moveGuardToNextWaypoint (agent: GuardAgent, index: number)
    {
        if (this.gameWon || this.gameLost)
        {
            return;
        }

        const marker = this.guardMarkers[index];

        if (!marker || agent.waypointIndex >= agent.waypoints.length)
        {
            agent.moving = false;

            return;
        }

        const nextWaypoint = agent.waypoints[agent.waypointIndex];
        const target = cellToWorld(nextWaypoint);

        agent.perception.facing = initialFacing(agent.perception.cell, nextWaypoint);

        const distanceInCells = Math.hypot(
            (target.x - marker.shape.x) / CELL_SIZE,
            (target.y - marker.shape.y) / CELL_SIZE
        );
        const duration = (distanceInCells * 1000) / GUARD_MOVE_SPEED;

        this.tweens.add({
            targets: [ marker.shape, marker.label ],
            x: target.x,
            y: target.y,
            duration,
            ease: 'Linear',
            onUpdate: () => {
                this.trackGuardCellChange(agent, index);
            },
            onComplete: () => {
                if (this.gameWon || this.gameLost)
                {
                    return;
                }

                agent.perception.cell = nextWaypoint;
                this.refreshPerception();

                if (this.gameLost)
                {
                    return;
                }

                agent.waypointIndex++;

                if (agent.waypointIndex >= agent.waypoints.length)
                {
                    agent.moving = false;
                    agent.path = [];
                    agent.waypoints = [];
                    agent.waypointIndex = 0;

                    return;
                }

                this.moveGuardToNextWaypoint(agent, index);
            }
        });
    }

    private trackGuardCellChange (agent: GuardAgent, index: number)
    {
        const marker = this.guardMarkers[index];

        if (!marker)
        {
            return;
        }

        const cell = worldToCell(marker.shape.x, marker.shape.y);

        if (!cell || cellsEqual(cell, agent.perception.cell))
        {
            return;
        }

        agent.perception.cell = cell;
        this.refreshPerception();
    }

    private getCurrentCell (): Cell
    {
        return {
            col: Math.round((this.ladron.x - GRID_X) / CELL_SIZE - 0.5),
            row: Math.round((this.ladron.y - GRID_Y) / CELL_SIZE - 0.5)
        };
    }

    private cancelMovement (cell: Cell)
    {
        this.tweens.killTweensOf(this.ladron);

        const position = cellToWorld(cell);

        this.ladron.setPosition(position.x, position.y);

        this.ladronCell = cell;
        this.currentPath = [];
        this.waypoints = [];
        this.waypointIndex = 0;
        this.pathIndex = 0;
        this.moving = false;

        this.refreshPerception();
    }

    private moveToNextWaypoint ()
    {
        if (this.waypointIndex >= this.waypoints.length)
        {
            this.moving = false;
            return;
        }

        const nextWaypoint = this.waypoints[this.waypointIndex];
        const target = cellToWorld(nextWaypoint);
        const distanceInCells = Math.hypot(
            (target.x - this.ladron.x) / CELL_SIZE,
            (target.y - this.ladron.y) / CELL_SIZE
        );
        const duration = (distanceInCells * 1000) / MOVE_SPEED;

        this.tweens.add({
            targets: this.ladron,
            x: target.x,
            y: target.y,
            duration,
            ease: 'Linear',
            onUpdate: () => {
                this.trackLadronCellChange();
            },
            onComplete: () => {
                this.ladronCell = nextWaypoint;

                const targetIndex = this.findPathIndex(nextWaypoint);

                this.resolveTraversedCells(targetIndex);

                if (targetIndex >= 0)
                {
                    this.pathIndex = targetIndex;
                }

                this.refreshPerception();

                if (this.gameWon || this.gameLost)
                {
                    return;
                }

                this.waypointIndex++;
                this.drawRoute();

                if (this.gameWon || this.gameLost)
                {
                    return;
                }

                if (this.waypointIndex >= this.waypoints.length)
                {
                    this.moving = false;
                    return;
                }

                this.moveToNextWaypoint();
            }
        });
    }

    private drawRoute ()
    {
        this.routeGraphics.clear();

        const startIndex = Math.max(0, this.waypointIndex - 1);
        const remainingPath = this.waypoints.slice(startIndex);

        if (!this.routeVisible || remainingPath.length < 2)
        {
            return;
        }

        this.routeGraphics.lineStyle(3, COLORS.route, 0.9);
        this.routeGraphics.beginPath();

        remainingPath.forEach((cell, index) => {
            const position = cellToWorld(cell);

            if (index === 0)
            {
                this.routeGraphics.moveTo(position.x, position.y);
            }
            else
            {
                this.routeGraphics.lineTo(position.x, position.y);
            }
        });

        this.routeGraphics.strokePath();

        remainingPath.forEach((cell) => {
            const position = cellToWorld(cell);

            this.routeGraphics.fillStyle(COLORS.route, 1);
            this.routeGraphics.fillCircle(position.x, position.y, 3);
        });

        const destination = remainingPath[remainingPath.length - 1];
        const destinationPosition = cellToWorld(destination);

        this.routeGraphics.fillStyle(COLORS.route, 1);
        this.routeGraphics.fillCircle(destinationPosition.x, destinationPosition.y, 6);
    }

    private showMessage (message: string)
    {
        this.messageTimer?.remove(false);

        this.messageText.setColor('#ffb4a2').setText(message);

        this.messageTimer = this.time.delayedCall(1800, () => {
            this.messageText.setText('');
            this.messageTimer = undefined;
        });
    }

    private showPersistentMessage (message: string, color = '#7ee787')
    {
        this.messageTimer?.remove(false);
        this.messageTimer = undefined;

        this.messageText.setColor(color).setText(message);
    }
}
