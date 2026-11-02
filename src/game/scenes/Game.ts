import { Scene } from 'phaser';
import type { GameObjects, Input, Time } from 'phaser';
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
import { findPath, type SearchAlgorithm } from '../pathfinding';
import { buildWaypoints, type NavigationMode } from '../navigation';
import { generateScenario, type GuardCount, type Scenario } from '../scenario';

const MOVE_SPEED = 5;

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
    guard: 0xff5c5c
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
    private treasuresCollected = 0;
    private collectedTreasures = new Set<string>();
    private treasureMarkers: TreasureMarker[] = [];
    private keyMarker!: MarkerParts;
    private doorMarker!: MarkerParts;
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
        this.treasuresCollected = 0;
        this.collectedTreasures = new Set<string>();
        this.treasureMarkers = [];
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

        this.routeGraphics = this.add.graphics().setDepth(3);

        const start = cellToWorld(this.ladronCell);

        this.ladron = this.add.circle(start.x, start.y, CELL_SIZE * 0.28, COLORS.ladron)
            .setStrokeStyle(2, 0x111318, 1)
            .setDepth(4);

        this.drawHud();

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

        this.scenario.guards.forEach((guard) => {
            this.addScenarioMarker(guard, COLORS.guard, 'G', 'circle', CELL_SIZE * 0.62);
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
        if (pointer.y < GRID_Y || this.gameWon)
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

            if (this.gameWon)
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
            onComplete: () => {
                this.ladronCell = nextWaypoint;

                const targetIndex = this.findPathIndex(nextWaypoint);

                this.resolveTraversedCells(targetIndex);

                if (targetIndex >= 0)
                {
                    this.pathIndex = targetIndex;
                }

                this.waypointIndex++;
                this.drawRoute();

                if (this.gameWon)
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

    private showPersistentMessage (message: string)
    {
        this.messageTimer?.remove(false);
        this.messageTimer = undefined;

        this.messageText.setColor('#7ee787').setText(message);
    }
}
