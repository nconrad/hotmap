/**
 * heatmap.js
 *
 * Author: https://github.com/nconrad
 *
 */
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
const canvasWidth = window.innerWidth;
const canvasHeight = window.innerHeight;
let yViewSize = 10;
let xViewSize = 1000;

// color/size of chart boxes
const boxColor = 0xff0000;

// general chart settings
const margin = {
    top: 165,
    left: 165,
    right: 100 // here we are essentially using right margin for angled text
};


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

        // cell size
        this.cellXDim = 1;
        this.cellYDim = 20;

        // start coordinates in matrix for "viewbox"
        this.xStart = 0;
        this.yStart = 0;

        this.ele.innerHTML = container;
        this.labelNames = this.getMockLabelNames(this.size.y, this.size.x);
        this.sprites = this.loadSprites(matrix);

        this.labels = {x: [], y: []}; // store label svg objects for mouse tracking

        this.start();

        return this;
    }

    start() {
        // create renderer
        let obj = this.createSVGContainers(canvasWidth, canvasHeight);
        this.svg = obj.svg;
        this.xAxis = obj.xAxis;
        this.yAxis = obj.yAxis;

        let renderer = this.renderer(canvasWidth, canvasHeight);

        this.ele.querySelector('.webgl-canvas')
            .appendChild(renderer.view);

        if (PARTICLE_CONTAINER) {
            this.stage = new PIXI.particles.ParticleContainer();
            this.stage._maxSize = xViewSize * yViewSize;
        } else {
            this.stage = new PIXI.Container();
        }

        // initialize scale x/y width controls
        new ScaleCtrl({
            ele: this.ele,
            xValue: this.cellXDim,
            yValue: this.cellYDim,
            onXChange: val => {
                this.cellXDim = val;
                this.renderChart(true);
            },
            onYChange: val => {
                this.cellYDim = val;
                this.renderChart(false, true);
            },
        });

        // todo: implement in webgl?
        this.xScrollBar = new ScrollBar({
            type: 'horizontal',
            ele: document.querySelector('.x-scrollbar'),
            onMove: this.onHorizontalScroll.bind(this),
            max: this.size.x,
            x: margin.left,
            // y: update y on render for now
            width: xViewSize
        });

        this.renderChart(true, true);
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
    renderChart(scaleX, scaleY) {
        this.clearStage(scaleX, scaleY);

        let cellXDim = this.cellXDim,
            cellYDim = this.cellYDim;

        let xStart = this.xStart,
            yStart = this.yStart;

        // use cell size to compute "view box" of sorts
        xViewSize = (canvasWidth - margin.left - margin.right) / this.cellXDim;
        // yViewSize = (canvasHeight - margin.top) / this.cellYDim;

        // for each row
        for (let i = 0; i < yViewSize; i++) {
            let y = margin.top + cellYDim * i;
            let rowIdx = yStart + i;

            if (cellYDim > 6 && scaleY) {
                this.addSVGLabel(this.labelNames.y[rowIdx], margin.top - 10, y + 3, 'y');
            }

            // for each column
            for (let j = 0; j < xViewSize; j++) {
                let x = margin.left + cellXDim * j,
                    colIdx = xStart + j;

                let sprite = this.sprites[rowIdx][colIdx];
                sprite.x = x;
                sprite.y = y;
                sprite.height = cellYDim;
                sprite.width = cellXDim;
                // Todo: set on texture? (optimize)
                sprite.alpha = this.matrix[rowIdx][colIdx];

                this.stage.addChild(sprite);

                if (i == 0 && cellXDim > 5 && scaleX) {
                    this.addSVGLabel(this.labelNames.x[colIdx], x + 2, margin.top - 10, 'x');
                }
            }
        }

        // also move scrollbars if needed
        if (scaleY) {
            let top = yViewSize * this.cellYDim + margin.top;
            this.xScrollBar.setYPosition(top);
        }

        if (scaleX) {
            let width = xViewSize * this.cellXDim;
            this.xScrollBar.setWidth(width);
        }
    }

    createSVGContainers(width, height) {
        let svg = document.createElementNS(svgNS, 'svg');
        svg.style.position = 'absolute';
        svg.style.top = 0;
        svg.style.left = 0;
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);

        let xAxis = document.createElementNS(svgNS, 'g');
        xAxis.setAttribute('class', 'x-axis');
        let yAxis = document.createElementNS(svgNS, 'g');
        yAxis.setAttribute('class', 'y-axis');

        svg.appendChild(xAxis);
        svg.appendChild(yAxis);
        this.ele.querySelector('.svg-canvas').appendChild(svg);

        return {svg, xAxis, yAxis};
    }

    // Todo: optimize
    addSVGLabel(text, x, y, axis) {
        let ele = document.createElementNS(svgNS, 'text');
        if (axis == 'y') {
            ele.innerHTML = text;

            ele.setAttribute('font-size', `${this.cellYDim <= 16 ? this.cellYDim - 2 : 16}px`);
            ele.setAttribute('fill', '#666');
            ele.setAttribute('x', x);
            ele.setAttribute('y', y + this.cellYDim / 2 + 1 );
            this.yAxis.appendChild(ele);

            let width = ele.getBBox().width;
            ele.setAttribute('transform', `translate(-${width})`);
            return;
        }

        x += this.cellXDim / 2 + 1;
        ele.innerHTML = text;
        ele.setAttribute('font-size', `${this.cellXDim <= 16 ? this.cellXDim - 2 : 16}px`);
        ele.setAttribute('fill', '#666');
        ele.setAttribute('x', x);
        ele.setAttribute('y', y);
        this.xAxis.appendChild(ele);

        ele.setAttribute('transform', `rotate(-45, ${x}, ${y})`);
    }


    getMockLabelNames(m, n) {
        let labels = { x: [], y: [] };
        for (let i = 0; i < m; i++) {
            labels.y.push(`This is row ${i}`);
        }

        for (let j = 0; j < n; j++) {
            labels.x.push(`This is column ${j}`);
        }
        return labels;
    }


    loadSprites() {
        let sprites = [];

        // for each row
        for (let i = 0; i < this.size.y; i++) {
            let y = margin.top + this.cellYDim * i;

            let row = [];
            // for each column
            for (let j = 0; j < this.size.x; j++) {
                let x = margin.top + this.cellXDim * j;

                let sprite = this.loadSprite();
                row.push(sprite);
            }
            sprites.push(row);
        }

        return sprites;
    }


    loadSprite() {
        let texture = new PIXI.Sprite.fromImage(spritePath);
        return texture;
    }

    // Deprecated
    createTextureFromGraphic(x, y, w, h) {
        let g = new PIXI.Graphics();
        g.beginFill(boxColor);
        g.drawRect(x, y, w, h);
        let texture = new PIXI.Sprite(g.generateCanvasTexture());
        return texture;
    }

    clearStage(scaleX, scaleY) {
        if (scaleX) {
            while (this.xAxis.hasChildNodes()) {
                this.xAxis.removeChild(this.xAxis.firstChild);
            }
        }
        if (scaleY) {
            while (this.yAxis.hasChildNodes()) {
                this.yAxis.removeChild(this.yAxis.firstChild);
            }
        }

        let i = this.stage.children.length;
        while (i--) {
            this.stage.removeChild(this.stage.children[i]);
        };
    }

    onHorizontalScroll(xPos) {
        let ratio = xPos / this.xScrollBar.width;
        let xStart = parseInt(ratio * this.size.x);

        if (xStart === this.xStart) return;
        this.xStart = xStart;

        this.renderChart(true);
    }

}
