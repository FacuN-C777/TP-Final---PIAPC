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

const CANVAS_WIDTH = 1024;
const HUD_ROW_1_Y = 18;
const HUD_ROW_2_Y = 48;
const HUD_ROW_3_Y = 78;
const HUD_MARGIN = 14;
const HUD_GAP = 8;
const LEGEND_Y = 734;
const LEGEND_SWATCH = 16;
const LEGEND_TEXT_GAP = 6;
const LEGEND_ITEM_GAP = 18;
const MESSAGE_Y = 758;
const ACTIVE_BUTTON_COLOR = '#7cc6ff';
const INACTIVE_BUTTON_COLOR = '#3a404c';

const ALGORITHM_OPTIONS: readonly { readonly value: SearchAlgorithm; readonly label: string }[] = [
    { value: 'BFS', label: 'BFS (1)' },
    { value: 'DFS', label: 'DFS (2)' },
    { value: 'A*', label: 'A* (3)' }
];

const NAVIGATION_OPTIONS: readonly { readonly value: NavigationMode; readonly label: string }[] = [
    { value: 'cells', label: 'Por celdas' },
    { value: 'smooth', label: 'Suavizada' }
];

const GUARD_COUNT_OPTIONS: readonly GuardCount[] = [ 1, 2 ];

const GUARD_STATE_STYLE: Record<GuardState, { readonly label: string; readonly background: string; readonly color: string }> = {
    PATRULLA: { label: 'Patrulla', background: '#59606d', color: '#e6e9ef' },
    INVESTIGAR: { label: 'Investiga', background: '#ffa94d', color: '#111318' },
    PERSEGUIR: { label: 'Persigue', background: '#ff5c5c', color: '#111318' }
};

interface LegendItem
{
    readonly label: string;
    readonly shape: 'circle' | 'square' | 'cross';
    readonly color: number;
    readonly letter?: string;
}

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
    route: 0xffffff,
    ladron: 0x40e0d0,
    key: 0xffd166,
    door: 0x9c6b3f,
    treasure: 0xff9f43,
    exit: 0x7ee787,
    hiding: 0xb388ff,
    guard: 0xff5c5c,
    vision: 0xb0c4de,
    visionAlert: 0xff5c5c,
    hearing: 0x8a9bff,
    lastKnown: 0xff8fd0,
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
    private gameStateBadge!: GameObjects.Text;
    private detectionBadge!: GameObjects.Text;
    private guardStateBadges: GameObjects.Text[] = [];
    private routeGraphics!: GameObjects.Graphics;
    private keyBadge!: GameObjects.Text;
    private doorBadge!: GameObjects.Text;
    private treasureBadge!: GameObjects.Text;
    private algorithmLabel!: GameObjects.Text;
    private navigationLabel!: GameObjects.Text;
    private guardLabel!: GameObjects.Text;
    private algorithmButtons!: Map<SearchAlgorithm, GameObjects.Text>;
    private navigationButtons!: Map<NavigationMode, GameObjects.Text>;
    private guardCountButtons!: Map<GuardCount, GameObjects.Text>;
    private routeButton!: GameObjects.Text;
    private newGameButton!: GameObjects.Text;
    private messageText!: GameObjects.Text;
    private messageTimer?: Time.TimerEvent;

    constructor ()
    {
        super('Game');
    }

    init ()
    {
        // Algoritmo, navegación, cantidad de guardias y ruta visible se conservan entre partidas.
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

        // La visión y la audición se recortan a la grilla para no tapar la franja superior ni la leyenda.
        const gridMaskShape = this.make.graphics({ x: 0, y: 0 }, false);

        gridMaskShape.fillStyle(0xffffff).fillRect(GRID_X, GRID_Y, GRID_WIDTH, GRID_HEIGHT);

        this.perceptionGraphics = this.add.graphics().setDepth(2.5);
        this.perceptionGraphics.setMask(gridMaskShape.createGeometryMask());

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
            this.startNewGame();
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
        this.add.text(CANVAS_WIDTH / 2, HUD_ROW_1_Y, 'Asecho Nocturno', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '26px',
            color: '#f4f1e8'
        }).setOrigin(0.5).setDepth(10);

        this.gameStateBadge = this.createBadge('');
        this.detectionBadge = this.createBadge('');
        this.guardStateBadges = [ this.createBadge(''), this.createBadge('') ];

        this.keyBadge = this.createBadge('');
        this.doorBadge = this.createBadge('');
        this.treasureBadge = this.createBadge('');

        this.algorithmLabel = this.createHudText('Búsqueda:');
        this.algorithmButtons = new Map();
        ALGORITHM_OPTIONS.forEach((option) => {
            this.algorithmButtons.set(option.value, this.createButton(option.label, () => {
                this.setAlgorithm(option.value);
            }));
        });

        this.navigationLabel = this.createHudText('Navegación (N):');
        this.navigationButtons = new Map();
        NAVIGATION_OPTIONS.forEach((option) => {
            this.navigationButtons.set(option.value, this.createButton(option.label, () => {
                this.setNavigationMode(option.value);
            }));
        });

        this.guardLabel = this.createHudText('Guardias:');
        this.guardCountButtons = new Map();
        GUARD_COUNT_OPTIONS.forEach((count) => {
            this.guardCountButtons.set(count, this.createButton(String(count), () => {
                this.setGuardCount(count);
            }));
        });

        this.routeButton = this.createButton('', () => {
            this.toggleRoute();
        });

        this.newGameButton = this.createButton('Nueva partida (R)', () => {
            this.startNewGame();
        });

        this.drawLegend();

        this.messageText = this.add.text(CANVAS_WIDTH / 2, MESSAGE_Y, '', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '15px',
            color: '#ffb4a2'
        }).setOrigin(0.5).setDepth(10);

        this.updateHud();
    }

    private createBadge (text: string): GameObjects.Text
    {
        return this.add.text(0, 0, text, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#e6e9ef',
            backgroundColor: '#59606d',
            padding: { left: 8, right: 8, top: 2, bottom: 2 }
        }).setOrigin(0, 0.5).setDepth(10);
    }

    private createHudText (text: string): GameObjects.Text
    {
        return this.add.text(0, 0, text, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '14px',
            color: '#aab2c0'
        }).setOrigin(0, 0.5).setDepth(10);
    }

    private createButton (label: string, onClick: () => void): GameObjects.Text
    {
        const button = this.add.text(0, 0, label, {
            fontFamily: 'Arial, sans-serif',
            fontSize: '13px',
            fontStyle: 'bold',
            color: '#e6e9ef',
            backgroundColor: INACTIVE_BUTTON_COLOR,
            padding: { left: 10, right: 10, top: 3, bottom: 3 }
        }).setOrigin(0, 0.5).setDepth(10).setInteractive({ useHandCursor: true });

        button.on('pointerdown', onClick);
        button.on('pointerover', () => {
            button.setAlpha(0.8);
        });
        button.on('pointerout', () => {
            button.setAlpha(1);
        });

        return button;
    }

    private setButtonActive (button: GameObjects.Text, active: boolean)
    {
        button.setBackgroundColor(active ? ACTIVE_BUTTON_COLOR : INACTIVE_BUTTON_COLOR);
        button.setColor(active ? '#111318' : '#e6e9ef');
    }

    private setBadge (badge: GameObjects.Text, text: string, background: string, color: string)
    {
        badge.setText(text).setBackgroundColor(background).setColor(color);
    }

    private drawLegend ()
    {
        const items: readonly LegendItem[] = [
            { label: 'Ladrón', shape: 'circle', color: COLORS.ladron },
            { label: 'Llave', shape: 'circle', color: COLORS.key, letter: 'L' },
            { label: 'Puerta', shape: 'square', color: COLORS.door, letter: 'P' },
            { label: 'Tesoro', shape: 'square', color: COLORS.treasure, letter: 'T' },
            { label: 'Salida', shape: 'square', color: COLORS.exit, letter: 'S' },
            { label: 'Escondite', shape: 'circle', color: COLORS.hiding, letter: 'E' },
            { label: 'Guardia', shape: 'circle', color: COLORS.guard, letter: 'G' },
            { label: 'Última posición', shape: 'cross', color: COLORS.lastKnown }
        ];

        const entries = items.map((item) => ({
            item,
            label: this.add.text(0, 0, item.label, {
                fontFamily: 'Arial, sans-serif',
                fontSize: '13px',
                color: '#c9cfd9'
            }).setOrigin(0, 0.5).setDepth(10)
        }));

        const totalWidth = entries.reduce((sum, entry) => {
            return sum + LEGEND_SWATCH + LEGEND_TEXT_GAP + entry.label.width;
        }, 0) + LEGEND_ITEM_GAP * (entries.length - 1);

        let x = CANVAS_WIDTH / 2 - totalWidth / 2;

        entries.forEach((entry) => {
            this.drawLegendSwatch(entry.item, x + LEGEND_SWATCH / 2, LEGEND_Y);
            entry.label.setPosition(x + LEGEND_SWATCH + LEGEND_TEXT_GAP, LEGEND_Y);
            x += LEGEND_SWATCH + LEGEND_TEXT_GAP + entry.label.width + LEGEND_ITEM_GAP;
        });
    }

    private drawLegendSwatch (item: LegendItem, x: number, y: number)
    {
        if (item.shape === 'cross')
        {
            const size = LEGEND_SWATCH / 2 - 1;

            this.add.graphics().setDepth(10)
                .lineStyle(2, item.color, 1)
                .lineBetween(x - size, y - size, x + size, y + size)
                .lineBetween(x + size, y - size, x - size, y + size);

            return;
        }

        const swatch = item.shape === 'circle'
            ? this.add.circle(x, y, LEGEND_SWATCH / 2, item.color, 0.9)
            : this.add.rectangle(x, y, LEGEND_SWATCH, LEGEND_SWATCH, item.color, 0.9);

        swatch.setStrokeStyle(1.5, 0x111318, 0.9).setDepth(10);

        if (item.letter)
        {
            this.add.text(x, y, item.letter, {
                fontFamily: 'Arial Black, Arial, sans-serif',
                fontSize: '10px',
                color: '#111318'
            }).setOrigin(0.5).setDepth(11);
        }
    }

    private placeRow (items: GameObjects.Text[], y: number, anchor: 'left' | 'center' | 'right', x: number)
    {
        const visibleItems = items.filter((item) => item.visible);
        const totalWidth = visibleItems.reduce((sum, item) => sum + item.width, 0)
            + HUD_GAP * (visibleItems.length - 1);

        let cursor = anchor === 'left' ? x : anchor === 'center' ? x - totalWidth / 2 : x - totalWidth;

        visibleItems.forEach((item) => {
            item.setPosition(cursor, y);
            cursor += item.width + HUD_GAP;
        });
    }

    private layoutHud ()
    {
        const rightEdge = CANVAS_WIDTH - HUD_MARGIN;
        const center = CANVAS_WIDTH / 2;

        this.placeRow([ this.gameStateBadge, this.detectionBadge ], HUD_ROW_1_Y, 'left', HUD_MARGIN);
        this.placeRow(this.guardStateBadges, HUD_ROW_1_Y, 'right', rightEdge);

        this.placeRow([ this.keyBadge, this.doorBadge ], HUD_ROW_2_Y, 'left', HUD_MARGIN);
        this.placeRow(
            [ this.algorithmLabel, ...Array.from(this.algorithmButtons.values()) ],
            HUD_ROW_2_Y, 'center', center
        );
        this.placeRow(
            [ this.guardLabel, ...Array.from(this.guardCountButtons.values()) ],
            HUD_ROW_2_Y, 'right', rightEdge
        );

        this.placeRow([ this.treasureBadge ], HUD_ROW_3_Y, 'left', HUD_MARGIN);
        this.placeRow(
            [ this.navigationLabel, ...Array.from(this.navigationButtons.values()) ],
            HUD_ROW_3_Y, 'center', center
        );
        this.placeRow([ this.routeButton, this.newGameButton ], HUD_ROW_3_Y, 'right', rightEdge);
    }

    private updateHud ()
    {
        this.algorithmButtons.forEach((button, value) => {
            this.setButtonActive(button, value === this.algorithm);
        });

        this.navigationButtons.forEach((button, value) => {
            this.setButtonActive(button, value === this.navigationMode);
        });

        this.guardCountButtons.forEach((button, count) => {
            this.setButtonActive(button, count === this.guardCount);
        });

        this.routeButton.setText(`Ruta: ${this.routeVisible ? 'visible' : 'oculta'} (P)`);
        this.setButtonActive(this.routeButton, this.routeVisible);

        if (this.gameWon)
        {
            this.setBadge(this.gameStateBadge, 'Victoria', '#7ee787', '#111318');
        }
        else if (this.gameLost)
        {
            this.setBadge(this.gameStateBadge, 'Derrota', '#ff5c5c', '#111318');
        }
        else
        {
            this.setBadge(this.gameStateBadge, 'En juego', '#59606d', '#e6e9ef');
        }

        const anySees = this.guardAgents.some((agent) => agent.perception.seesThief);
        const anyNoise = this.guardAgents.some((agent) => {
            return hasRecentNoise(agent.perception, this.time.now, NOISE_NOTICE_MS);
        });

        if (anySees)
        {
            this.setBadge(this.detectionBadge, 'Detección: vista', '#ff5c5c', '#111318');
        }
        else if (anyNoise)
        {
            this.setBadge(this.detectionBadge, 'Detección: ruido', '#ffa94d', '#111318');
        }
        else
        {
            this.setBadge(this.detectionBadge, 'Detección: no', '#59606d', '#e6e9ef');
        }

        this.guardStateBadges.forEach((badge, index) => {
            const agent = this.guardAgents[index];

            badge.setVisible(agent !== undefined);

            if (agent === undefined)
            {
                return;
            }

            const style = GUARD_STATE_STYLE[agent.state];

            this.setBadge(badge, `Guardia ${index + 1}: ${style.label}`, style.background, style.color);
        });

        if (this.hasKey)
        {
            this.setBadge(this.keyBadge, 'Llave: sí', '#ffd166', '#111318');
        }
        else
        {
            this.setBadge(this.keyBadge, 'Llave: no', '#59606d', '#e6e9ef');
        }

        if (this.doorOpen)
        {
            this.setBadge(this.doorBadge, 'Puerta: abierta', '#7ee787', '#111318');
        }
        else
        {
            this.setBadge(this.doorBadge, 'Puerta: cerrada', '#ffb4a2', '#111318');
        }

        this.setBadge(
            this.treasureBadge,
            `Tesoros: ${this.treasuresCollected} / ${this.scenario.treasures.length}`,
            '#ff9f43',
            '#111318'
        );

        this.layoutHud();
    }

    private setAlgorithm (algorithm: SearchAlgorithm)
    {
        this.algorithm = algorithm;
        this.updateHud();
    }

    private toggleNavigation ()
    {
        this.setNavigationMode(this.navigationMode === 'cells' ? 'smooth' : 'cells');
    }

    private setNavigationMode (mode: NavigationMode)
    {
        if (mode === this.navigationMode)
        {
            return;
        }

        this.navigationMode = mode;

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

    private setGuardCount (count: GuardCount)
    {
        if (count === this.guardCount)
        {
            return;
        }

        this.guardCount = count;
        this.startNewGame();
    }

    private startNewGame ()
    {
        this.scene.restart();
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
