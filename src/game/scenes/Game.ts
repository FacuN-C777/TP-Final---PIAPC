import { Scene } from 'phaser';

const GRID_COLUMNS = 17;
const GRID_ROWS = 13;
const CELL_SIZE = 48;
const GRID_WIDTH = GRID_COLUMNS * CELL_SIZE;
const GRID_HEIGHT = GRID_ROWS * CELL_SIZE;
const GRID_X = (1024 - GRID_WIDTH) / 2;
const GRID_Y = 96;

const TEST_MAP: string[] = [
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

const COLORS = {
    floor: 0x2f333b,
    wall: 0x59606d,
    wallEdge: 0x7a8291,
    gridLine: 0x1c1f25
};

export class Game extends Scene
{
    constructor ()
    {
        super('Game');
    }

    create ()
    {
        this.cameras.main.setBackgroundColor(0x111318);

        this.drawGrid();
        this.drawHud();

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

            if (!cells || cells.length !== GRID_COLUMNS)
            {
                throw new Error(`La fila ${row} del mapa de prueba no tiene ${GRID_COLUMNS} celdas.`);
            }

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
        this.add.text(512, 26, 'Asecho Nocturno', {
            fontFamily: 'Arial Black, Arial, sans-serif',
            fontSize: '28px',
            color: '#f4f1e8'
        }).setOrigin(0.5);

        this.add.text(512, 60, 'Grilla de prueba 17 × 13  |  R: reiniciar la escena', {
            fontFamily: 'Arial, sans-serif',
            fontSize: '16px',
            color: '#aab2c0'
        }).setOrigin(0.5);
    }
}
