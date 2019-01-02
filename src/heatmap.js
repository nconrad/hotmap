import 'pixi.js/dist/pixi';

import container from './container.html';
import ScaleCtrl from './scale-ctrl';
import ScrollBar from './scrollbar';


// manually set framerate (ms) - for testing
// requestAnimationFrame is used if not set
const FRAME_RATE = null;
const FORCE_CANVAS = false;
const PARTICLE_CONTAINER = true;

// default view sizes (height & width)

const canvasWidth = 2500; // window.innerWidth,
const canvasHeight = 500; // window.innerHeight;
const yViewSize = 10;
const xViewSize = 1000;

// color/size of chart boxes
const boxColor = 0xff0000;

// general chart settings
const scrollWidth = 1200;
const margin = {top: 165, left: 200};
const spritePath = '../src/assets/red-box.png';
const svgNS = 'http://www.w3.org/2000/svg';
// const spriteLoader = new PIXI.loaders.Loader();


export default class Heatmap {
    constructor({ele, matrix}) {
        this.ele = ele;
        this.matrix = matrix;

        // m and n (row and cols) dimensions

        this.size = {
            y: matrix.length,
            x: matrix[0].length
        };

        // default cell size
        this.boxXLength = 1;
        this.boxYLength = 20;

        // start coordinates for viewbox
        this.xStart = 0;
        this.yStart = 0;

        this.ele.innerHTML = container;
        this.labelNames = this.getMockLabelNames(this.size.y, this.size.x);
        this.sprites = this.loadSprites(matrix);

        // spriteLoader.load((loader, resources) => this.start);

        this.start();

        return this;
    }

    start() {
        // create renderer
        let renderer = this.renderer(canvasWidth, canvasHeight);

        this.ele.querySelector('.chart')
            .appendChild(renderer.view);

        if (PARTICLE_CONTAINER) {
            this.stage = new PIXI.particles.ParticleContainer();
            this.stage._maxSize = xViewSize * yViewSize;
        } else {
            this.stage = new PIXI.Container();
        }

        this.svg = this.createSVGContainer(canvasWidth, canvasHeight);

        this.renderChart();
        let render = () => {
            renderer.render(this.stage);
            if (!FRAME_RATE) requestAnimationFrame(render);
        };

        // Manual framerate for testing
        if (FRAME_RATE) {
            setInterval(render, FRAME_RATE);
        } else {
            render();
        }

        // initialize scale x/y width controls
        new ScaleCtrl({
            ele: this.ele,
            xValue: this.boxXLength,
            yValue: this.boxYLength,
            onXChange: val => {
                this.clearStage();
                this.boxXLength = val;
                this.renderChart();
            },
            onYChange: val => {
                this.clearStage();
                this.boxYLength = val;
                this.renderChart();
            },
        });

        new ScrollBar({
            ele: document.querySelector('.scrollbar'),
            max: scrollWidth,
            onMove: this.onHorizontalScroll.bind(this)
        });
    }

    renderer(width, height) {
        let renderer;
        if (FORCE_CANVAS) {
            renderer = new PIXI.CanvasRenderer(width, height);
        } else {
            renderer = new PIXI.autoDetectRenderer(width, height, {
                transparent: true
            });
        }
        renderer.transparent = true;
        return renderer;
    }

    /**
     * rendering experiment
     */
    renderChart() {
        let self = this;
        // space between boxes
        let xOffSet = this.boxXLength,
            yOffSet = this.boxYLength;

        let xStart = this.xStart,
            yStart = this.yStart;

        // for each row
        for (let i = 0; i < yViewSize; i++) {
            let y = margin.top + yOffSet * i;
            let rowIdx = yStart + i;

            this.createSVGLabel(this.labelNames.y[rowIdx], margin.top - 10, y + 3, 'y');

            // for each column
            for (let j = 0; j < xViewSize; j++) {
                let x = margin.top + xOffSet * j,
                    colIdx = xStart + j;

                let sprite = this.sprites[rowIdx][colIdx];
                sprite.x = x;
                sprite.y = y;
                sprite.height = yOffSet;
                sprite.width = xOffSet;
                // Todo: set on texture? (optimize)
                sprite.alpha = this.matrix[rowIdx][colIdx];

                this.stage.addChild(sprite);

                if (i == 0 && xOffSet > 5) {
                    this.createSVGLabel(this.labelNames.x[colIdx], x + 2, margin.top - 10, 'x');
                }
            }
        }
    }

    createSVGContainer(width, height) {
        this.svg = document.createElementNS(svgNS, 'svg');
        this.svg.style.position = 'absolute';
        this.svg.style.top = 0;
        this.svg.style.left = 0;
        this.svg.setAttribute('width', width);
        this.svg.setAttribute('height', height);
        this.ele.querySelector('.chart').appendChild(this.svg);

        return this.svg;
    }

    // Todo: optimize
    createSVGLabel(text, x, y, axis) {
        let ele = document.createElementNS(svgNS, 'text');
        if (axis == 'y') {
            ele.innerHTML = text;
            ele.setAttribute('fill', '#666');
            ele.setAttribute('x', x);
            ele.setAttribute('y', y + this.boxYLength / 2 + 1 );
            this.svg.appendChild(ele);

            let width = ele.getBBox().width;
            ele.setAttribute('transform', `translate(-${width})`);
        } else if (axis == 'x') {
            ele.innerHTML = text;
            ele.setAttribute('fill', '#666');
            ele.setAttribute('x', x);
            ele.setAttribute('y', y);
            this.svg.appendChild(ele);

            ele.setAttribute('transform', `rotate(-45, ${x}, ${y})`);
        }
    }


    getMockLabelNames(m, n) {
        let labels = { x: [], y: [] };
        for (let i = 0; i < m; i++) {
            labels.y.push(`This is row ${i}`);
        }

        for (let j = 0; j < n; j++) {
            labels.x.push(`This is column ${j}`)
        }
        return labels;
    }


    loadSprites() {
        let sprites = [];

        // for each row
        for (let i = 0; i < this.size.y; i++) {
            let y = margin.top + this.boxYLength * i;

            let row = [];
            // for each column
            for (let j = 0; j < this.size.x; j++) {
                let x = margin.top + this.boxXLength * j;

                let sprite = this.loadSprite(x, y, this.boxXLength, this.boxYLength);
                row.push(sprite);
            }
            sprites.push(row);
        }

        return sprites;
    }


    loadSprite(x, y, w, h) {
        let texture = new PIXI.Sprite.fromImage(spritePath);
        return texture;
    }

    // deprecated
    createTextureFromGraphic(x, y, w, h) {
        let g = new PIXI.Graphics();
        g.beginFill(boxColor);
        g.drawRect(x, y, w, h);
        let texture = new PIXI.Sprite(g.generateCanvasTexture());
        return texture;
    }

    clearStage() {
        // Todo: optimize
        while (this.svg.hasChildNodes()) {
            this.svg.removeChild(this.svg.firstChild);
        }

        let i = this.stage.children.length;
        while (i--) {
            this.stage.removeChild(this.stage.children[i]);
        };
    }

    onHorizontalScroll(xPos) {
        let ratio = xPos / scrollWidth;
        let xStart = parseInt(ratio * this.size.x);

        if (xStart === this.xStart) return;
        this.xStart = xStart;

        this.clearStage();
        this.renderChart();
    }
}
