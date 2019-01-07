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

import {
    labelColor,
    labelHoverColor,
    svgNS,
    boxColor
} from './consts';


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

// general chart settings
const margin = {
    top: 165,
    left: 165,
    right: 100 // here we are essentially using right margin for angled text
};

const spritePath = '../src/assets/red-box.png';
// const spriteLoader = new PIXI.loaders.Loader();


export default class Heatmap {
    constructor({ele, matrix, colLabels, rowLabels}) {
        this.ele = ele;
        this.matrix = matrix;

        this.labelNames = {
            x: colLabels,
            y: rowLabels
        };

        // m and n (row and cols) dimensions
        this.size = {
            y: matrix.length,
            x: matrix[0].length
        };

        // cell size
        this.cellXDim = 15;
        this.cellYDim = 15;

        // start coordinates in matrix for "viewbox"
        this.xStart = 0;
        this.yStart = 0;

        this.ele.innerHTML = container;
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
                this.addSVGLabel(rowIdx, margin.top - 10, y + 3, i, 'y');
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
                    this.addSVGLabel(colIdx, x + 2, margin.top - 10, j, 'x');
                }
            }
        }

        // also adjust scrollbars if needed
        if (scaleY) {
            let top = yViewSize * this.cellYDim + margin.top;
            this.xScrollBar.setYPosition(top);
        }

        if (scaleX) {
            let width = xViewSize * this.cellXDim;
            this.xScrollBar.setWidth(width);
        }

        this.mouseTracker();
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
    addSVGLabel(matIdx, x, y, cellIdx, axis) {
        let ele = document.createElementNS(svgNS, 'text');
        if (axis == 'y') {
            ele.innerHTML = this.labelNames[axis][matIdx];

            ele.setAttribute('font-size', `${this.cellYDim <= 16 ? this.cellYDim - 2 : 16}px`);
            ele.setAttribute('class', `row-${cellIdx}`);
            ele.setAttribute('fill', '#666');
            ele.setAttribute('x', x);
            ele.setAttribute('y', y + this.cellYDim / 2 + 1 );
            this.yAxis.appendChild(ele);

            let width = ele.getBBox().width;
            ele.setAttribute('transform', `translate(-${width})`);
            return;
        }

        x += this.cellXDim / 2 + 1;
        ele.innerHTML = this.labelNames[axis][matIdx];
        ele.setAttribute('class', `col-${cellIdx}`);
        ele.setAttribute('font-size', `${this.cellXDim <= 16 ? this.cellXDim - 2 : 16}px`);
        ele.setAttribute('fill', '#666');
        ele.setAttribute('x', x);
        ele.setAttribute('y', y);
        this.xAxis.appendChild(ele);

        ele.setAttribute('transform', `rotate(-45, ${x}, ${y})`);
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

    mouseTracker() {
        let cellXStart = margin.left,
            cellYStart = margin.top;

        let width = xViewSize * this.cellXDim,
            height = yViewSize * this.cellYDim;

        // add a container for tracking (if needed)
        let container;
        if (!this.mouseContainer) {
            container = document.createElement('div');
            container.className = 'mouse-tracker';
            container.style.position = 'absolute';
            this.ele.querySelector('.chart').appendChild(container);
            this.mouseContainer = container;
        } else {
            container = this.mouseContainer;
            container.removeEventListener('mousemove', this.onMove);
            container.removeEventListener('mouseout', this.onMouseOut);
        }

        // update container on scaling
        container.style.top = cellXStart;
        container.style.left = cellYStart;
        container.style.width = width;
        container.style.height = height;

        // here we use -1 since new to old cell comparison is made
        let coordinates = {x: -1, y: -1};

        this.onMove = evt => {
            let xPos = evt.offsetX,
                yPos = evt.offsetY;

            // relative position on visible cells
            let x = parseInt(xPos / this.cellXDim),
                y = parseInt(yPos / this.cellYDim);

            let oldX = coordinates.x,
                oldY = coordinates.y;

            // ignore boundaries
            if (x > xViewSize - 1 || y > yViewSize - 1 ) return;

            if (y !== oldY && this.yAxis.childNodes.length) {
                let label;
                // old cell hover styling
                if (oldY !== -1) {
                    label = this.yAxis.querySelector(`.row-${oldY}`);
                    label.setAttribute('fill', labelColor);
                    label.setAttribute('font-weight', 'normal');
                }
                // new cell hover styling
                label = this.yAxis.querySelector(`.row-${y}`);
                label.setAttribute('fill', labelHoverColor);
                label.setAttribute('font-weight', 'bold');
            }

            if (x !== oldX && this.xAxis.childNodes.length) {
                let label;
                if (oldX !== -1) {
                    label = this.xAxis.querySelector(`.col-${oldX}`);
                    label.setAttribute('fill', labelColor);
                    label.setAttribute('font-weight', 'normal');
                }
                label = this.xAxis.querySelector(`.col-${x}`);
                label.setAttribute('fill', labelHoverColor);
                label.setAttribute('font-weight', 'bold');
            }

            let i = this.yStart + y,
                j = this.xStart + x,
                value = this.matrix[i][j],
                xLabel = this.labelNames.x[j],
                yLabel = this.labelNames.y[i];

            this.setHoverInfo(xLabel, yLabel, value);

            coordinates = {x, y};
        };

        this.onMouseOut = () => {
            this.yAxis.childNodes.forEach(node => {
                node.setAttribute('fill', labelColor);
                node.setAttribute('font-weight', 'normal');
            });

            this.xAxis.childNodes.forEach(node => {
                node.setAttribute('fill', labelColor);
                node.setAttribute('font-weight', 'normal');
            });

            this.setHoverInfo('-', '-', '-');
            coordinates = {x: -1, y: -1};
        };

        container.addEventListener('mousemove', this.onMove);
        container.addEventListener('mouseout', this.onMouseOut);
    }

    setHoverInfo(xLabel, yLabel, value) {
        this.ele.querySelector('.header .info').innerHTML =
            `<div><b>x:</b> ${xLabel}<div>` +
            `<div><b>y:</b> ${yLabel}</div>` +
            `<div><b>value:</b> ${value}</div>`;
    }
}


