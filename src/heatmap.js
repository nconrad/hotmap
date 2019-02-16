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
import Options from './options';
import { matUnitize, svgRect, addLegend } from './utils';
import { getCategoryColors } from './colors';

import {
    labelColor,
    labelHoverColor,
    svgNS
} from './consts';


const FORCE_CANVAS = false;
const PARTICLE_CONTAINER = false;

// view size (in terms of matrix)
let yViewSize;
let xViewSize;

// general chart settings
const margin = {
    top: 200,
    bottom: 150,
    left: 275,
    right: 125 // here we are essentially using right margin for angled text
};

const minTextW = 2;
const maxTextW = 16;
const categoryWidth = 40;

// const cellPadding = 1;

const spritePath = '../src/assets/sprites/ff0000.png';

export default class Heatmap {
    constructor(params) {
        this.ele = params.ele;

        this.rows = params.rows;
        this.cols = params.cols;
        this.matrix = params.matrix;

        let {matrix, max} = matUnitize(params.matrix);
        this.alphaMatrix = matrix;

        this.rowCategories = this.getCategories(params.rows);
        this.rowCatLabels = params.rowCatLabels;
        this.onHover = params.onHover;

        // get category colors
        // Todo: optimize?
        this.rowCatColors = getCategoryColors(this.rowCategories);

        // m and n (row and cols) dimensions
        this.size = {
            x: params.matrix[0].length,
            y: params.matrix.length,
            max: max
        };

        // cell size
        this.cellXDim = 1; // (canvasWidth - margin.left - margin.right) / this.size.x;
        this.cellYDim = 1; // (canvasWidth - margin.top - margin.bottom) / this.size.y * 0.5;

        // start coordinates in matrix for "viewbox"
        this.xStart = 0;
        this.yStart = 0;

        this.ele.innerHTML = container;

        // components to be instantiated
        this.scaleCtrl;
        this.xScrollBar;
        this.yScrollBar;


        PIXI.loader.add('redCell', spritePath).load((ldr, resources) => {
            this.sprites = resources;
            this.start();
        });

        return this;
    }

    start() {
        // base all positioning off of parent
        let [canvasWidth, canvasHeight] = this.getContainerSize();

        // create renderer
        let obj = this.initSVGContainers(canvasWidth, canvasHeight);
        this.svg = obj.svg;
        this.xAxis = obj.xAxis;
        this.yAxis = obj.yAxis;
        this.cAxis = obj.cAxis;

        let renderer = this.getRenderer(canvasWidth, canvasHeight);
        this.renderer = renderer;

        this.ele.querySelector('.webgl-canvas')
            .appendChild(renderer.view);

        if (PARTICLE_CONTAINER) {
            this.stage = new PIXI.particles.ParticleContainer();
            this.stage.alpha = true;
            this.stage._maxSize = this.size.x * this.size.y;
        } else {
            this.stage = new PIXI.Container();
            this.stage._maxSize = this.size.x * this.size.y;
            this.catStage = new PIXI.Container();
            this.stage.addChild(this.catStage);
        }

        // initialize scale x/y width controls
        this.scaleCtrl = new ScaleCtrl({
            ele: this.ele,
            xValue: this.cellXDim,
            yValue: this.cellYDim,
            onXChange: (val, isLocked) => {
                this.cellXDim = val;
                if (isLocked) {
                    this.cellYDim = val;
                    this.renderChart(true, true, true);
                } else {
                    this.renderChart(true, false, true);
                }
                return {x: this.cellXDim, y: this.cellYDim};
            },
            onYChange: (val, isLocked) => {
                this.cellYDim = val;
                if (isLocked) {
                    this.cellXDim = val;
                    this.renderChart(true, true, true);
                } else {
                    this.renderChart(false, true, true);
                }
                return {x: this.cellXDim, y: this.cellYDim};
            },
            onLockClick: lockOpen => {
                let x = this.cellXDim,
                    y = this.cellYDim;

                if (y > x)
                    this.cellXDim = y;
                else
                    this.cellYDim = x;

                this.renderChart(true, true, true);

                return {x: this.cellXDim, y: this.cellYDim};
            }
        });

        // add scrollbars.  note we most update positions on rendering
        // todo: implement in webgl?
        this.xScrollBar = new ScrollBar({
            type: 'horizontal',
            ele: document.querySelector('.x-scrollbar'),
            onMove: this.onHorizontalScroll.bind(this),
            max: this.size.x,
            x: margin.left,
            // y: changes with y scaling
            width: xViewSize
        });

        this.yScrollBar = new ScrollBar({
            type: 'vertical',
            ele: document.querySelector('.y-scrollbar'),
            onMove: this.onVerticalScroll.bind(this),
            max: this.size.y,
            y: margin.top,
            // x: changes with x scaling
            height: yViewSize
        });

        addLegend(this.svg, 250, 16, 0, this.size.max);

        // render is used by rAF when needed
        this.render = () => {
            renderer.render(this.stage);
        };

        this.renderChart(true, true);
        this.isStaged = true;
        this.catLabelsAdded = true;


        // Todo: cleanup pre-render staging
        this.cellXDim = 5;
        this.cellYDim = 10;
        this.scaleCtrl._setValues({x: this.cellXDim, y: this.cellYDim});
        this.renderChart(true, true, true);
        this.render();

        // adjust canvas to window/container
        window.addEventListener('resize', this.resize.bind(this));

        // initialize options
        this.options = new Options({
            parentNode: this.ele,
            openBtn: document.querySelector('.opts-btn'),
            onSort: (cat) => this.categorySort(cat)
        });

    }

    getRenderer(width, height) {
        let renderer;
        if (FORCE_CANVAS) {
            renderer = new PIXI.CanvasRenderer(width, height);
            renderer.transparent = true;
        } else {
            renderer = new PIXI.autoDetectRenderer(width, height, {
                transparent: true
            });
        }
        return renderer;
    }

    /**
     * rendering experiment
     * todo: break into stage and update alpha
     */
    renderChart(renderX, renderY, scale) {
        this.clearStage(renderX, renderY, scale);

        let cellXDim = this.cellXDim,
            cellYDim = this.cellYDim;

        let xStart = this.xStart,
            yStart = this.yStart;

        // use cell size to compute "view box" of sorts
        // Todo: optimize, moving into resize event
        xViewSize = parseInt((window.innerWidth - margin.left - margin.right) / cellXDim);
        yViewSize = parseInt((window.innerHeight - margin.top - margin.bottom) / cellYDim);
        if (yViewSize > this.size.y) yViewSize = this.size.y;

        // for each row
        for (let i = 0; i < yViewSize; i++) {
            let y = margin.top + cellYDim * i;
            let rowIdx = yStart + i;

            // enforce bounds
            if (rowIdx >= this.size.y) {
                // set anything below view box to 0 alpha for now
                for (let k = 0; k < xViewSize; k++) {
                    let idx = i * xViewSize + k + 1,
                        sprite = this.stage.children[idx];
                    if (sprite) sprite.alpha = 0;
                }
                continue;
            }

            if (cellYDim > minTextW && renderY) {
                this.addSVGLabel('y', this.rows[rowIdx].name, margin.left - categoryWidth - 10, y + 3, i);
            }
            if (renderY) {
                this.addCategories('y', rowIdx, margin.left - categoryWidth, y);
            }

            // for each column
            for (let j = 0; j < xViewSize; j++) {
                let x = margin.left + cellXDim * j,
                    colIdx = xStart + j;


                // enforce bounds
                if (colIdx >= this.size.x) {
                    // must add 1 to ignore category container stage
                    let sprite = this.stage.children[i * xViewSize + j + 1];
                    if (sprite) sprite.alpha = 0;
                    continue;
                }

                // if sprites rendered, just making transformations
                if (this.isStaged) {
                    // must add 1 to ignore category container stage
                    let sprite = this.stage.children[i * xViewSize + j + 1];
                    sprite.alpha = this.alphaMatrix[rowIdx][colIdx];
                    sprite.x = x;
                    sprite.y = y;
                    sprite.height = cellYDim;
                    sprite.width = cellXDim;
                } else {
                    let sprite = new PIXI.Sprite(this.sprites.redCell.texture);
                    sprite.x = x;
                    sprite.y = y;
                    sprite.height = cellYDim;
                    sprite.width = cellXDim;
                    sprite.alpha = this.alphaMatrix[rowIdx][colIdx];
                    this.stage.addChild(sprite);
                }

                if (i == 0 && cellXDim > minTextW && renderX) {
                    this.addSVGLabel('x', this.cols[colIdx].name, x + 2, margin.top - 5, j);
                }

                if (!this.catLabelsAdded && i == 0 && renderX && colIdx < this.rowCatLabels.length) {
                    this.addCategoryLabel('x', this.rowCatLabels[this.rowCatLabels.length - colIdx - 1],
                        margin.left - colIdx * (categoryWidth / this.rowCatLabels.length),
                        margin.top - 5, j);
                }
            }
        }

        /**
         * also adjust scrollbars if needed
         **/
        if (renderY || this.scaleCtrl.isLocked()) {
            let top = yViewSize * this.cellYDim + margin.top;
            this.xScrollBar.setYPosition(top);

            let height = yViewSize * this.cellYDim;
            this.yScrollBar.setLength(height);

            // if y-axis is out-of-range, hide
            if (yViewSize >= this.size.y) {
                this.yScrollBar.hide();
            } else {
                this.yScrollBar.show();
            }
        }

        if (renderX || this.scaleCtrl.isLocked()) {
            let width = xViewSize * this.cellXDim;
            this.xScrollBar.setLength(width);

            let left = xViewSize * this.cellXDim + margin.left;
            this.yScrollBar.setXPosition(left);

            // if x-axis is out-of-range
            if (xViewSize >= this.size.x) {
                this.xScrollBar.hide();
            } else {
                this.xScrollBar.show();
            }
        }

        // update tracker
        this.mouseTracker();
        requestAnimationFrame(this.render);
    }

    initSVGContainers(width, height) {
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

        let cAxis = document.createElementNS(svgNS, 'g');
        cAxis.setAttribute('class', 'cat-axis');
        cAxis.style.height = margin.top - 50;

        svg.appendChild(xAxis);
        svg.appendChild(yAxis);
        svg.appendChild(cAxis);
        this.ele.querySelector('.svg-canvas').appendChild(svg);

        return {svg, xAxis, yAxis, cAxis};
    }

    /**
     *
     * @param {string} axis the axis to append to
     * @param {number} index the row or col index for the provided matrix
     * @param {number} x the x position of the text element
     * @param {number} y the y position of the text element
     * @param {number} cellIdx the row or col index in the "viewbox" the user sees
     *                    this is currently used for classes
     */
    addSVGLabel(axis, text, x, y, cellIdx) {
        let ele = document.createElementNS(svgNS, 'text');

        if (axis == 'y') {
            ele.setAttribute('font-size', `${this.cellYDim <= maxTextW ? this.cellYDim - 2 : 16}px`);
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
        ele.setAttribute('font-size', `${this.cellXDim <= maxTextW ? this.cellXDim - 2 : 16}px`);
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

        // optional super pretty ellipsis?
        // this.textEllipsis(ele, text, margin.top + 10); // add some for angle

        ele.setAttribute('transform', `translate(-${width})`);
        ele.setAttribute('transform', `rotate(-45, ${x}, ${y})`);
    }

    addCategoryLabel(axis, text, x, y, cellIdx) {
        let ele = document.createElementNS(svgNS, 'text');

        x -= 4;
        ele.innerHTML = text;
        ele.setAttribute('class', `cat-${cellIdx}`);
        ele.setAttribute('font-size', '14px');
        ele.setAttribute('fill', '#666');
        ele.setAttribute('x', x);
        ele.setAttribute('y', y);
        this.cAxis.appendChild(ele);

        let width = ele.getBBox().width;

        ele.setAttribute('transform', `translate(-${width})`);
        ele.setAttribute('transform', `rotate(-90, ${x}, ${y})`);
    }


    addCategories(axis, index, x, y) {
        let categories = this.rowCategories[index];

        // compute width of each category from: total / number-of-cateogries
        let width = parseInt(categoryWidth / categories.length );

        for (let i = 0; i < categories.length; i++) {
            let sprite = this.textureRect( this.rowCatColors[index][i] );
            sprite.x = x;
            sprite.y = y;
            sprite.height = this.cellYDim;
            sprite.width = width - 1; // -1 spacing

            this.catStage.addChild(sprite);
            x += width;
        }
    }

    // Todo: (optimize) cache textures
    textureRect(color) {
        let g = new PIXI.Graphics();
        g.beginFill(color);
        g.drawRect(1, 1, 10, 10);
        g.endFill();
        return new PIXI.Sprite(g.generateCanvasTexture());
    }

    // not currently used
    stageSprites() {
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

    // not currently used
    stageSprite(i, j) {
        // implement
        return null;
    }

    clearStage(clearX, clearY, clearStage) {
        if (clearX) {
            while (this.xAxis.hasChildNodes()) {
                this.xAxis.removeChild(this.xAxis.firstChild);
            }
        }
        if (clearY) {
            while (this.yAxis.hasChildNodes()) {
                this.yAxis.removeChild(this.yAxis.firstChild);
            }

            let i = this.catStage.children.length;
            while (i--) {
                if (this.catStage.children[i].pluginName == 'sprite')
                    this.catStage.removeChild(this.catStage.children[i]);
            };
        }

        // Todo: there's possibly some sort of optimization here
        // when cells are out of range
        if (clearStage) {
            // must ignore category stage
            for (let i = 1; i < this.stage.children.length; i++) {
                this.stage.children[i].alpha = 0;
            }
        }
    }

    onHorizontalScroll(xStart) {
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
        // otherwise, just reinit mouse events
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
                if (label) {
                    label.setAttribute('fill', labelHoverColor);
                    label.setAttribute('font-weight', 'bold');
                }
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
                    j = this.xStart + x;

                // Todo: fix.  Enforce bounds due to scrolling
                if (i >= this.size.y || j >= this.size.x) return;

                let value = this.matrix[i][j],
                    xLabel = this.cols[j].name,
                    yLabel = this.rows[i].name;

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
            `<div><b>row:</b> ${yLabel}</div>` +
            `<div><b>column:</b> ${xLabel}<div>` +
            `<div><b>Value:</b> ${value}</div>`;

        // add tooltip
        this.ele.querySelector('.header .info').innerHTML = content;
        let tooltip = this.ele.querySelector('.tooltip');
        tooltip.style.display = 'block';
        tooltip.style.top = y + cellYDim; // place at bottom right
        tooltip.style.left = x + cellXDim;
        tooltip.innerHTML = this.onHover({
            xLabel, yLabel, value,
            rowCategories: this.rowCategories[i]
        });

        // add hover box
        if (x && y) {
            this.ele.querySelectorAll('.hover-box').forEach(el => el.remove());
            this.svg.appendChild( svgRect(x, y, cellXDim, cellYDim, {class: 'hover-box'}) );
        }
    }


    getContainerSize() {
        let parent = this.ele.parentNode;
        return [parent.clientWidth, parent.clientHeight];
    }

    resize() {
        let [canvasWidth, canvasHeight] = this.getContainerSize();

        this.renderer.resize(canvasWidth, canvasHeight);
        this.svg.setAttribute('width', canvasWidth);
        this.svg.setAttribute('height', canvasHeight);

        this.renderChart(true, true, true);
    }

    categorySort(category) {
        let catIdx = this.rowCatLabels.indexOf(category);

        // attach matrix rows to rows for sorting;
        this.rows.forEach((row, i) => {
            row.data = this.matrix[i];
        });

        // sort rows
        this.rows.sort((a, b) => a.categories[catIdx].localeCompare(b.categories[catIdx]));

        // get matrix back
        this.matrix = this.rows.map(row => row.data);

        // update all data
        this.updateData();

        this.catLabelsAdded = false;
        this.renderChart(true, true, true);
        this.catLabelsAdded = true;
    }

    // updates associated data models (such as categorical data
    updateData() {
        this.rowCategories = this.getCategories(this.rows);
        this.rowCatColors = getCategoryColors(this.rowCategories);

        // update alphas
        this.alphaMatrix = matUnitize(this.matrix).matrix;
    }

    getCategories(objs) {
        return objs.map(r => r.categories);
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


