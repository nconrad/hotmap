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
let yViewSize;
let xViewSize;

// general chart settings
const margin = {
    top: 200,
    bottom: 150,
    left: 220,
    right: 125 // here we are essentially using right margin for angled text
};

// const cellPadding = 1;

const spritePath = '../src/assets/ff0000.png';
// const spriteLoader = new PIXI.loaders.Loader();


export default class Heatmap {
    constructor({ele, matrix, xLabels, yLabels, onHover}) {
        this.ele = ele;
        this.matrix = matrix;
        this.labelNames = { x: xLabels, y: yLabels };
        this.onHover = onHover;

        // m and n (row and cols) dimensions
        this.size = {
            x: matrix[0].length,
            y: matrix.length
        };

        // cell size
        this.cellXDim = 10; // (canvasWidth - margin.left - margin.right) / this.size.x;
        this.cellYDim = (canvasWidth - margin.top - margin.bottom) / this.size.y * 0.5;

        // start coordinates in matrix for "viewbox"
        this.xStart = 0;
        this.yStart = 0;

        this.ele.innerHTML = container;
        this.sprites = this.loadSprites(matrix);

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
            this.stage._maxSize = this.size.x * this.size.y * 2;
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

        // add scrollbars.  note we most update positions on rendering
        // todo: implement in webgl?
        this.xScrollBar = new ScrollBar({
            type: 'horizontal',
            ele: document.querySelector('.x-scrollbar'),
            onMove: this.onHorizontalScroll.bind(this),
            max: this.size.x,
            x: margin.left,
            width: xViewSize
        });

        this.yScrollBar = new ScrollBar({
            type: 'vertical',
            ele: document.querySelector('.y-scrollbar'),
            onMove: this.onVerticalScroll.bind(this),
            max: this.size.y,
            y: margin.top,
            height: yViewSize
        });

        this.rendering = false;
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
        if (this.rendering) return;
        this.clearStage(scaleX, scaleY);

        let cellXDim = this.cellXDim,
            cellYDim = this.cellYDim;

        let xStart = this.xStart,
            yStart = this.yStart;

        // use cell size to compute "view box" of sorts
        // Todo: optimize, moving into resize event
        xViewSize = parseInt((canvasWidth - margin.left - margin.right) / cellXDim);
        yViewSize = parseInt((canvasHeight - margin.top - margin.bottom) / cellYDim);
        if (yViewSize > this.size.y) yViewSize = this.size.y;

        // for each row
        for (let i = 0; i < yViewSize; i++) {
            let y = margin.top + cellYDim * i;
            let rowIdx = yStart + i;

            // enforce bounds
            if (rowIdx >= this.size.y) continue;

            if (cellYDim > 4 && scaleY) {
                this.addSVGLabel('y', rowIdx, margin.left - 10, y + 3, i);
            }

            // for each column
            for (let j = 0; j < xViewSize; j++) {
                let x = margin.left + cellXDim * j,
                    colIdx = xStart + j;

                // enforce bounds
                if (colIdx >= this.size.x) continue;

                let sprite = this.sprites[rowIdx][colIdx];
                sprite.x = x;
                sprite.y = y;
                sprite.height = cellYDim;
                sprite.width = cellXDim;
                sprite.alpha = this.matrix[rowIdx][colIdx];
                this.stage.addChild(sprite);

                if (i == 0 && cellXDim > 4 && scaleX) {
                    this.addSVGLabel('x', colIdx, x + 2, margin.top - 10, j);
                }
            }
        }

        // also adjust scrollbars if needed
        if (scaleY) {
            let top = yViewSize * this.cellYDim + margin.top;
            this.xScrollBar.setYPosition(top);

            let height = yViewSize * this.cellYDim;
            this.yScrollBar.setLength(height);
        }

        if (scaleX) {
            let width = xViewSize * this.cellXDim;
            this.xScrollBar.setLength(width);

            let left = xViewSize * this.cellXDim + margin.left;
            this.yScrollBar.setXPosition(left);
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
        xAxis.style.height = margin.top - 50;
        let yAxis = document.createElementNS(svgNS, 'g');
        yAxis.setAttribute('class', 'y-axis');

        svg.appendChild(xAxis);
        svg.appendChild(yAxis);
        this.ele.querySelector('.svg-canvas').appendChild(svg);

        return {svg, xAxis, yAxis};
    }

    /**
     *
     * @param {string} axis the axis to append to
     * @param {number} matIdx the row or col index for the provided matrix
     * @param {number} x the x position of the text element
     * @param {number} y the y position of the text element
     * @param {number} cellIdx the row or col index in the "viewbox" the user sees
     *                    this is currently used for classes
     */
    addSVGLabel(axis, matIdx, x, y, cellIdx) {
        let ele = document.createElementNS(svgNS, 'text');
        let text = this.labelNames[axis][matIdx];

        if (axis == 'y') {
            ele.setAttribute('font-size', `${this.cellYDim <= 16 ? this.cellYDim - 2 : 16}px`);
            ele.setAttribute('class', `row-${cellIdx}`);
            ele.setAttribute('fill', '#666');
            ele.setAttribute('x', x);
            ele.setAttribute('y', y + this.cellYDim / 2 + 1 );
            this.yAxis.appendChild(ele);

            // add ellipsis
            if (text.length > 28 ) {
                text = text.slice(0, 28) + '...';
            }

            ele.innerHTML = text;

            let width = ele.getBBox().width;
            ele.setAttribute('transform', `translate(-${width})`);
            return;
        }

        x += this.cellXDim / 2 + 1;
        ele.innerHTML = text;
        ele.setAttribute('class', `col-${cellIdx}`);
        ele.setAttribute('font-size', `${this.cellXDim <= 16 ? this.cellXDim - 2 : 16}px`);
        ele.setAttribute('fill', '#666');
        ele.setAttribute('x', x);
        ele.setAttribute('y', y);
        this.xAxis.appendChild(ele);

        let width = ele.getBBox().width;

        // add ellipsis
        if (width > margin.top) {
            text = text.slice(0, 28) + '...';
            ele.innerHTML = text;
        }

        // add optional super pretty ellipsis?
        // this.textEllipsis(ele, text, margin.top + 10); // add some for angle

        ele.setAttribute('transform', `translate(-${width})`);
        ele.setAttribute('transform', `rotate(-45, ${x}, ${y})`);
    }

    loadSprites() {
        let sprites = [];

        // for each row
        for (let i = 0; i < this.size.y; i++) {
            let row = [];
            // for each column
            for (let j = 0; j < this.size.x; j++) {
                let sprite = this.loadSprite(i, j);
                row.push(sprite);
            }
            sprites.push(row);
        }

        return sprites;
    }

    loadSprite(i, j) {
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

    onHorizontalScroll(percent) {
        let xStart = parseInt(percent * this.size.x);

        if (xStart === this.xStart) return;
        this.xStart = xStart;

        this.renderChart(true);
    }

    onVerticalScroll(percent) {
        let yStart = parseInt(percent * this.size.y);

        if (yStart === this.yStart) return;
        this.yStart = yStart;

        this.renderChart(false, true);
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
        container.style.top = cellYStart;
        container.style.left = cellXStart;
        container.style.width = width;
        container.style.height = height;

        // here we use -1 since new to old cell comparison is made
        let coordinates = {x: -1, y: -1};

        this.onMove = evt => {
            // position of mouse
            let xPos = evt.offsetX,
                yPos = evt.offsetY;

            // relative position on visible cells
            let x = parseInt(xPos / this.cellXDim),
                y = parseInt(yPos / this.cellYDim);

            let oldX = coordinates.x,
                oldY = coordinates.y;

            // ignore boundaries
            if (x > xViewSize - 1 || y > yViewSize - 1 ) return;

            // if there even is y axis labels and we're changing cells
            if (this.yAxis.childNodes.length && y !== oldY) {
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

            // if there even is x axis labels and we're changing cells
            if (this.xAxis.childNodes.length && x !== oldX) {
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

            if (x !== oldX || y !== oldY) {
                let i = this.yStart + y,
                    j = this.xStart + x,
                    value = this.matrix[i][j],
                    xLabel = this.labelNames.x[j],
                    yLabel = this.labelNames.y[i];

                this.setHoverInfo(xLabel, yLabel, value, y, x);
            }


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

            let tooltip = this.ele.querySelector('.tooltip');
            tooltip.style.display = 'none';
            this.ele.querySelectorAll('.hover-box').forEach(el => el.remove());
        };

        container.addEventListener('mousemove', this.onMove);
        container.addEventListener('mouseout', this.onMouseOut);
    }

    setHoverInfo(xLabel, yLabel, value, i, j) {
        let cellXDim = this.cellXDim,
            cellYDim = this.cellYDim,
            x = margin.left + j * cellXDim,
            y = margin.top + i * cellYDim;

        let content =
            `<div><b>x:</b> ${xLabel}<div>` +
            `<div><b>y:</b> ${yLabel}</div>` +
            `<div><b>value:</b> ${value}</div>`;

        // add tooltip
        this.ele.querySelector('.header .info').innerHTML = content;
        let tooltip = this.ele.querySelector('.tooltip');
        tooltip.style.display = 'block';
        tooltip.style.top = y + cellYDim; // place at bottom right
        tooltip.style.left = x + cellXDim;
        tooltip.innerHTML = this.onHover(xLabel, yLabel, value);

        // add hover box
        if (x && y) {
            this.ele.querySelectorAll('.hover-box').forEach(el => el.remove());
            this.svg.appendChild( this.svgRect(x, y, cellXDim, cellYDim) );
        }
    }


    svgRect(x, y, w, h, fill = 'none') {
        let ele = document.createElementNS(svgNS, 'rect');

        ele.setAttribute('class', `hover-box`);
        ele.setAttribute('x', x);
        ele.setAttribute('y', y);
        ele.setAttribute('width', w);
        ele.setAttribute('height', h);
        ele.setAttribute('fill', fill);
        ele.setAttribute('stroke-width', 1);
        ele.setAttribute('stroke', 'rgb(0,0,0)');

        return ele;
    }


    /**
     * very pretty ellipsis, but
     * not currently used since there's a performance hit
     **/
    textEllipsis(ele, text, width) {
        // fixed bug in from the following:
        // https://stackoverflow.com/questions/15975440/add-ellipses-to-overflowing-text-in-svg
        ele.textContent = text;
        let len = text.length;
        while (ele.getSubStringLength(0, len--) > width) {
            ele.textContent = text.slice(0, len) + '...';
        }
    }

}


