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
    TEST_MAP,
    cellToWorld,
    cellsEqual,
    isWalkable,
    worldToCell,
    type Cell
} from '../grid';
import { findPath, type SearchAlgorithm } from '../pathfinding';
import { buildWaypoints, type NavigationMode } from '../navigation';

const MOVE_SPEED = 5;
const START_CELL: Cell = { col: 1, row: 1 };

const COLORS = {
    floor: 0x2f333b,
    wall: 0x59606d,
    wallEdge: 0x7a8291,
    gridLine: 0x1c1f25,
    route: 0x5ad1ff,
    ladron: 0xf2c14e
};

export class Game extends Scene
{
    private algorithm: SearchAlgorithm = 'BFS';
    private navigationMode: NavigationMode = 'cells';
    private routeVisible = true;
    private ladron!: GameObjects.Arc;
    private ladronCell: Cell = START_CELL;
    private currentPath: Cell[] = [];
    private waypoints: Cell[] = [];
    private waypointIndex = 0;
    private moving = false;
    private routeGraphics!: GameObjects.Graphics;
    private algorithmLabel!: GameObjects.Text;
    private algorithmBadge!: GameObjects.Text;
    private navigationLabel!: GameObjects.Text;
    private navigationBadge!: GameObjects.Text;
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
        this.ladronCell = START_CELL;
        this.currentPath = [];
        this.waypoints = [];
        this.waypointIndex = 0;
        this.moving = false;
        this.messageTimer = undefined;
    }

    create ()
    {
        this.cameras.main.setBackgroundColor(0x111318);

        this.drawGrid();

        this.routeGraphics = this.add.graphics().setDepth(1);

        const start = cellToWorld(this.ladronCell);

        this.ladron = this.add.circle(start.x, start.y, CELL_SIZE * 0.28, COLORS.ladron)
            .setStrokeStyle(2, 0x111318, 1)
            .setDepth(2);

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
            const cells = TEST_MAP[row];

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

        const algorithmWidth = this.algorithmLabel.width + gap + this.algorithmBadge.width;
        const algorithmStartX = 512 - algorithmWidth / 2;

        this.algorithmLabel.setPosition(algorithmStartX, 50);
        this.algorithmBadge.setPosition(algorithmStartX + this.algorithmLabel.width + gap, 50);

        const navigationWidth = this.navigationLabel.width + gap + this.navigationBadge.width;
        const navigationStartX = 512 - navigationWidth / 2;

        this.navigationLabel.setPosition(navigationStartX, 70);
        this.navigationBadge.setPosition(navigationStartX + this.navigationLabel.width + gap, 70);

        this.controlsText.setText(
            `Ruta: ${routeState}  |  1 BFS · 2 DFS · 3 A*  |  N: navegación  |  P: ruta  |  R: reiniciar`
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
        const target = worldToCell(pointer.x, pointer.y);

        if (!target)
        {
            this.showMessage('Clic inválido: fuera de la grilla.');
            return;
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

        const path = findPath(origin, target, this.algorithm);

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
        this.moving = true;

        this.drawRoute();
        this.moveToNextWaypoint();
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
                this.waypointIndex++;
                this.drawRoute();

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

        this.messageText.setText(message);

        this.messageTimer = this.time.delayedCall(1800, () => {
            this.messageText.setText('');
            this.messageTimer = undefined;
        });
    }
}
