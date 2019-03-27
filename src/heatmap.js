/**
 * heatmap.js
 *
 * Author: https://github.com/nconrad
 *
 * Todo:
 *      IE polyfill remove()/append()
 *      IE polyfill proxy
 *
 */
import 'pixi.js/dist/pixi';

import container from './container.html';
import ScaleCtrl from './scale-ctrl';
import ScrollBar from './scrollbar';
import MouseTracker from './mouse-tracker';
import Options from './options';
import { addLegend } from './legend';
import { matMinMax } from './utils';
import { svgNS, svgRect, svgG } from './svg';
import { setAttributes } from './dom';
import { getColorMatrix, getCategoryColors, rgbToHex, toHex } from './color';

// import Picker from 'vanilla-picker';

import { labelColor, labelHoverColor } from './consts';
import './assets/styles/heatmap.less';

PIXI.utils.skipHello();

const FORCE_CANVAS = false;
const PARTICLE_CONTAINER = false;

// view size (in terms of size of matrix)
let yViewSize;
let xViewSize;

const cellXMin = 1;
const cellXMax = 100;
const zoomFactor = 0.1; // speed at which to zoom with mouse

// general chart settings
const margin = {
    top: 200,
    bottom: 150,
    left: 275,
    right: 125 // here we are essentially using right margin for angled text
};

const minTextW = 2;
const maxTextW = 16;
let rowCatWidth = 40;
let colCatWidth = 40;
// const cellPadding = 1;

export default class Heatmap {
    constructor(params) {
        this.validateParams(params);

        // ***** initialize params *****
        this.ele = params.ele;

        this.rows = params.rows;
        this.cols = params.cols;
        this.matrix = params.matrix;
        this.defaults = params.defaults || {};

        this.color = params.color || 'gradient';
        this.origColorSettings = this.color;
        try {
            this.colorMatrix = getColorMatrix(this.matrix, this.color);
        } catch (error) {
            alert(error);
            return;
        }

        this.rowCategories = this.getCategories(params.rows);
        this.colCategories = this.getCategories(params.cols);
        if (!this.rowCategories) rowCatWidth = 0;
        if (!this.colCategories) colCatWidth = 0;

        this.rowCatLabels = params.rowCatLabels || [];
        this.colCatLabels = params.colCatLabels || [];

        this.onHover = params.onHover;

        // get category colors; Todo: optimize?
        this.rowCatColors = this.rowCategories
            ? getCategoryColors(this.rowCategories) : [];

        // ***** end params *****

        // m and n (row and cols) dimensions
        this.size = this.getMatrixStats(params.matrix);

        // start coordinates in matrix for "viewbox"
        this.xStart = 0;
        this.yStart = 0;

        this.ele.innerHTML = container;

        // components to be instantiated
        this.scaleCtrl;
        this.scrollBars;
        this.mouseTracker;

        this.start();

        return this;
    }

    validateParams(params) {
        let {ele, rows, cols, matrix} = params;
        let name = `hotmap.js`;

        // validate params
        if (!ele) alert(`${name}: Must provide an element to attach chart to.`);
        else if (!matrix) alert(`${name}: Must provide an matrix of values.`);
        else if (!rows) alert(`${name}: Must provide some sort of row labels.`);
        else if (!cols) alert(`${name}: Must provide some sort of column labels.`);

        let rowCatLbls = params.rowCatLabels;
        if (rowCatLbls !== null && !rowCatLbls && 'categories' in rows[0]) {
            console.warn(
                `${name}: No labels were provided for row categories.
                Use "rowCatLabels: null" to dismiss`
            );
        }

        let colCatLbls = params.colCatLabels;
        if (colCatLbls !== null && !colCatLbls && 'categories' in rows[0]) {
            console.warn(
                `${name}: No labels were provided for column categories.
                Use "colCatLabels: null" to dismiss`
            );
        }

        // validate data
        let validMat = matrix.filter(r => r.length !== matrix[0].length).length == 0;
        if (!validMat) alert('Must provide matrix with same number of columns.');
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

        // initialize scale x/y width controls
        this.scaleCtrl = this.getScaleCtrl();

        // add (fake) scrollbars.
        // we update size of content area on render
        this.scrollBars = this.getScrollBars();

        // add mouse tracker.
        // we update the size of the area on render
        this.mouseTracker = this.getMouseTracker();

        this.updateLegend();

        let renderer = this.getRenderer(canvasWidth, canvasHeight);
        this.renderer = renderer;

        this.init();

        // adjust canvas on resize
        let resizeTO;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTO);
            resizeTO = setTimeout(this.resize.bind(this), 100);
        });

        // initialize options
        this.options = new Options({
            parentNode: this.ele,
            openBtn: document.querySelector('.opts-btn'),
            color: this.color,
            onColorChange: (type) => {
                this.color = type === 'gradient' ? type : this.origColorSettings;
                this.colorMatrix = getColorMatrix(this.matrix, this.color);

                // change legend
                this.updateLegend();

                this.renderChart();
            }
        });

        // start tracking sorting
        this.sorter(this.svg);

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

    initStage() {
        this.isStaged = false;
        this.renderChart(true, true);
        this.isStaged = true;
    }


    init(resize) {
        if (this.ele.querySelector('.webgl-canvas canvas')) {
            this.ele.querySelector('.webgl-canvas canvas').remove();
        }

        this.ele.querySelector('.webgl-canvas')
            .appendChild(this.renderer.view);

        if (PARTICLE_CONTAINER) {
            this.stage = new PIXI.particles.ParticleContainer();
            this.stage.alpha = true;
            this.stage._maxSize = this.size.x * this.size.y;
        } else {
            this.stage = new PIXI.Container();
            // this.stage._maxSize = this.size.x * this.size.y;
            this.catStage = new PIXI.Container();
            this.stage.addChild(this.catStage);
        }

        // render is used by rAF when needed
        this.render = () => {
            this.renderer.render(this.stage);
        };

        // initial staging of 1x1 cells
        this.initStage();

        if (!resize) {
            this.cellXDim = this.defaults.cellW || 1; // (canvasWidth - margin.left - margin.right) / this.size.x;
            this.cellYDim = this.defaults.cellH || 10;
        }
        this.scaleCtrl._setValues({x: this.cellXDim, y: this.cellYDim});
        this.renderChart(true, true, true);
    }


    /**
     * todo: break into stage and update tint
     */
    renderChart(renderX, renderY, scale) {
        // let t0 = performance.now();
        this.clearStage(renderX, renderY, scale);

        let cellXDim, cellYDim;
        if (this.isStaged) {
            cellXDim = this.cellXDim;
            cellYDim = this.cellYDim;
        } else {
            cellXDim = 1;
            cellYDim = 1;
        }

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
                this.addSVGLabel('y', this.rows[rowIdx].name, margin.left - rowCatWidth - 10, y + 3, i);
            }
            if (renderY && this.rowCategories) {
                this.addCategories('y', rowIdx, margin.left - rowCatWidth, y);
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
                    sprite.tint = this.colorMatrix[rowIdx][colIdx];
                    sprite.alpha = 1.0;
                    sprite.x = x;
                    sprite.y = y;
                    sprite.height = cellYDim;
                    sprite.width = cellXDim;
                } else {
                    let sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
                    sprite.x = x;
                    sprite.y = y;
                    sprite.height = cellYDim;
                    sprite.width = cellXDim;
                    this.stage.addChild(sprite);
                }

                if (i == 0 && cellXDim > minTextW && renderX) {
                    this.addSVGLabel('x', this.cols[colIdx].name, x + 2, margin.top - 5, j);
                }

                if (this.colCategories && !this.catLabelsAdded && i == 0 &&
                    renderX && colIdx < this.rowCatLabels.length) {
                    let k = this.rowCatLabels.length - colIdx - 1;
                    this.addCategoryLabel('x', this.rowCatLabels[k],
                        margin.left - colIdx * (colCatWidth / this.rowCatLabels.length),
                        margin.top - 5, k);
                }
            }
        }

        /**
         * also adjust scrollbars if needed
         **/
        if (renderY || this.scaleCtrl.isLocked()) {
            this.scrollBars.setHeight(cellYDim * this.size.y );

            let height = yViewSize * cellYDim;
            this.scrollBars.setContentHeight(height);

            // if y-axis is out-of-range, hide
            if (yViewSize >= this.size.y) {
                this.scrollBars.hideY();
            } else {
                this.scrollBars.showY();
            }
        }

        if (renderX || this.scaleCtrl.isLocked()) {
            this.scrollBars.setWidth(cellXDim * this.size.x);

            let width = xViewSize * cellXDim;
            this.scrollBars.setContentWidth(width);

            // if x-axis is out-of-range
            if (xViewSize >= this.size.x) {
                this.scrollBars.hideX();
            } else {
                this.scrollBars.showX();
            }
        }

        this.mouseTracker.update({
            top: margin.top,
            left: margin.left,
            width: xViewSize * cellXDim,
            height: yViewSize * cellYDim,
            cellXSize: cellXDim,
            cellYSize: cellYDim
        });
        requestAnimationFrame(this.render); // draw
        this.catLabelsAdded = true;
        this.selectable();
        // let t1 = performance.now();
        // console.log('render time', t1 - t0);
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
            y += this.cellYDim / 2 + 1;
            ele.setAttribute('font-size', `${this.cellYDim <= maxTextW ? this.cellYDim - 2 : 16}px`);
            ele.setAttribute('class', `row-${cellIdx}`);
            ele.setAttribute('fill', '#666');
            ele.setAttribute('x', x);
            ele.setAttribute('y', y);
            this.yAxis.appendChild(ele);

            // add ellipsis
            if (text.length > 28 ) {
                text = text.slice(0, 28) + '...';
            }

            ele.innerHTML = text;

            let width = ele.getBBox().width;
            ele.setAttribute('transform', `translate(-${width})`);

            ele.addEventListener('mouseover', () => {
                let tt = this.tooltip(y - ele.getBBox().height - 5, x + 10);

                let cats = this.rowCatLabels.length == 0 ? ''
                    : this.rowCategories[cellIdx].map((cat, i) =>
                        `<br><div><b>${this.rowCatLabels[i]}:</b> ${cat}</div>`
                    ).join('');

                tt.innerHTML =
                    `<div>${this.rows[cellIdx].name}</div>
                    ${cats}`;
            });

            ele.onclick = () => {
                let r = this.getRow(cellIdx);
                alert(`Selected ${r.length} Protein Familes from ${this.rows[cellIdx].name}:\n
                ${r[0].id}, ${r[1].id}, ..., ${r[r.length - 1].id}\n
                ${r[0].val}, ${r[1].val}, ..., ${r[r.length - 1].val}`);
            };

        } else {
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

            ele.setAttribute('transform', `translate(-${width})`);
            ele.setAttribute('transform', `rotate(-45, ${x}, ${y})`);


            ele.addEventListener('mouseover', () => {
                let tt = this.tooltip(y, x - 5);

                let cats = this.colCatLabels.length === 0 ? ''
                    : this.colCategories[cellIdx].map((cat, i) =>
                        `<br><div><b>${this.colCatLabels[i]}:</b> ${cat}</div>`
                    ).join('');

                tt.innerHTML =
                    `<div>${this.cols[cellIdx].name}</div>
                    ${cats}`;
            });

            ele.onclick = () => {
                let r = this.getCol(cellIdx);
                alert(`Selected ${r.length} Genomes with ${this.cols[cellIdx].name}:\n
                ${r[0].id}, ${r[1].id}, ..., ${r[r.length - 1].id}\n
                ${r[0].val}, ${r[1].val}, ..., ${r[r.length - 1].val}`);
            };
        }

        ele.addEventListener('mouseout', this.hideHoverTooltip.bind(this));
    }

    getRow(i) {
        return this.matrix[i].map((val, j) => {
            return { id: this.cols[j].categories[0], val };
        });
    }

    getCol(j) {
        return this.matrix.map((val, i) => {
            return { id: this.rows[i].name, val: val[j] };
        });
    }

    getSelection(i1, j1, i2, j2) {
        let selected = [];

        for (let i = i1; i <= i2; i++) {
            let row = this.matrix[i];

            for (let j = j1; j <= j2; j++) {
                let val = this.matrix[i][j];

                selected.push({
                    val: val,
                    rowName: this.rows[i].name,
                    colName: this.cols[j].name,
                    rowCats: this.rowCategories[i],
                    colCats: this.colCategories[j]
                });
            }
        }

        return selected;
    }

    addCategoryLabel(axis, text, x, y, idx) {
        let ele = document.createElementNS(svgNS, 'text');

        let g = svgG();

        x -= 4;
        ele.innerHTML = text;

        setAttributes(ele, {
            'class': `cat-label`,
            'data-idx': idx,
            'data-name': text,
            'font-size': '14px',
            'fill': '#666',
            'x': x,
            'y': y
        });
        g.appendChild(ele);

        this.cAxis.appendChild(g);

        let width = ele.getBBox().width;

        ele.setAttribute('transform', `translate(-${width})`);
        ele.setAttribute('transform', `rotate(-90, ${x}, ${y})`);

        ele.onclick = (evt) => {
            this.sortModel[text] = this.sortModel[text] == 'asc' ? 'dsc' : 'asc';
        };
    }

    addCategories(axis, index, x, y) {
        let categories = this.rowCategories[index];

        // compute width of each category from: total / number-of-cateogries
        let width = parseInt(rowCatWidth / categories.length );

        for (let i = 0; i < categories.length; i++) {
            let sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
            sprite.tint = this.rowCatColors[index][i];
            sprite.x = x;
            sprite.y = y;
            sprite.height = this.cellYDim;
            sprite.width = width - 1; // -1 spacing

            this.catStage.addChild(sprite);
            x += width;
        }
    }


    sorter(svg) {
        // data model for sorting
        // { <cat_name>: <'asc'|'dsc'> }
        let model = {};

        let handler = {
            get: (target, key) => {
                return target[key];
            },
            set: (target, key, val) => {
                // only allow one selection at time right now
                Object.keys(target).forEach(k => {
                    if (k !== key) target[k] = null;
                });
                target[key] = val;

                // clear sort in dom
                svg.querySelectorAll('.cat-label').forEach(label => {
                    let idx = label.getAttribute('data-idx');
                    label.innerHTML = this.rowCatLabels[idx];
                });

                let ele = svg.querySelector(`.cat-label[data-name="${key}"]`);
                ele.innerHTML = `${val === 'dsc' ? `&#8250; ` : `&#8249; `} ${key}`;

                // sort
                this.rowCatSort(key, val === 'dsc');

                return true;
            }
        };

        this.sortModel = new Proxy(model, handler);
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
        this.xStart = xStart;
        this.renderChart(true);
    }

    onVerticalScroll(yStart) {
        this.yStart = yStart;
        this.renderChart(false, true);
    }

    getScaleCtrl() {
        return new ScaleCtrl({
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
    }

    getScrollBars() {
        return new ScrollBar({
            ele: this.ele,
            x: margin.left,
            y: margin.top,
            width: xViewSize,
            height: yViewSize,
            contentWidth: this.cellXDim * this.size.x,
            contentHeight: this.cellYDim * this.size.y,
            xMax: this.size.x,
            yMax: this.size.y,
            onMove: (direction, pos) => {
                if (direction === 'x') this.onHorizontalScroll(pos);
                else if (direction === 'y') this.onVerticalScroll(pos);
                this.hideHoverTooltip();
            },
            onMouseWheel: change => {
                let {deltaY} = change;

                this.hideHoverTooltip();
                // update cell size
                let newXDim = this.cellXDim - deltaY * zoomFactor;
                this.cellXDim = newXDim < cellXMin
                    ? cellXMin : (newXDim > cellXMax ? cellXMax : newXDim);

                this.renderChart(true, null, true);

                // update controls
                this.scaleCtrl._setValues({x: this.cellXDim, y: this.cellYDim});
            }
        });
    }

    getMouseTracker() {
        return new MouseTracker({
            ele: document.querySelector('.scroll-container'),
            top: margin.top,
            left: margin.left,
            width: xViewSize * this.cellXDim,
            height: yViewSize * this.cellYDim,
            cellXSize: this.cellXDim,
            cellYSize: this.cellYDim,
            m: this.size.y,
            n: this.size.x,
            onCellMouseOver: (pos) => this.onCellMouseOver(pos),
            onCellMouseOut: () => this.onCellMouseOut(),
        });
    }

    onCellMouseOver(posObj) {
        let {x, y, oldX, oldY} = posObj;

        if (x > xViewSize - 1 || y > yViewSize - 1 ) return;

        // if there even is y axis labels and we're changing cells
        if (this.yAxis.childNodes.length && y !== oldY) {
            let label;
            // old cell hover styling
            if (oldY !== -1 && oldY < yViewSize ) {
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
            if (oldX !== -1 && oldX < xViewSize) {
                label = this.xAxis.querySelector(`.col-${oldX}`);
                label.setAttribute('fill', labelColor);
                label.setAttribute('font-weight', 'normal');
            }
            label = this.xAxis.querySelector(`.col-${x}`);
            label.setAttribute('fill', labelHoverColor);
            label.setAttribute('font-weight', 'bold');
        }

        let i = this.yStart + y,
            j = this.xStart + x;

        let value = this.matrix[i][j],
            xLabel = this.cols[j].name,
            yLabel = this.rows[i].name;

        this.setHoverInfo(xLabel, yLabel, value, i, j, x, y);
    }

    onCellMouseOut() {
        this.yAxis.childNodes.forEach(node => {
            node.setAttribute('fill', labelColor);
            node.setAttribute('font-weight', 'normal');
        });

        this.xAxis.childNodes.forEach(node => {
            node.setAttribute('fill', labelColor);
            node.setAttribute('font-weight', 'normal');
        });

        this.hideHoverInfo();
        this.hideHoverTooltip();
    }

    setHoverInfo(xLabel, yLabel, value, i, j, x, y) {
        let cellXDim = this.cellXDim,
            cellYDim = this.cellYDim;

        x = margin.left + x * cellXDim;
        y = margin.top + y * cellYDim;

        let content =
            `<div><b>row:</b> ${yLabel}</div>` +
            `<div><b>column:</b> ${xLabel.length > 50 ? xLabel.slice(0, 50) + '...' : xLabel}<div>` +
            `<div><b>Value:</b> ${value}</div>`;

        this.ele.querySelector('.header .info').innerHTML = content;

        let top = y + cellYDim,
            left = x + cellXDim;
        let tooltip = this.tooltip(top, left);
        tooltip.innerHTML = this.onHover ? this.onHover({
            xLabel, yLabel, value,
            rowCategories: this.rowCategories[i],
            colCategories: this.colCategories[j]
        }) : content;

        // add hover box
        if (x && y) {
            this.ele.querySelectorAll('.hover-box').forEach(el => el.remove());
            this.svg.appendChild( svgRect(x, y, cellXDim, cellYDim, {class: 'hover-box'}) );
        }
    }

    tooltip(top, left) {
        let tooltip = this.ele.querySelector('.tooltip');
        tooltip.style.display = 'block';
        tooltip.style.top = top; // place at bottom right
        tooltip.style.left = left;
        return tooltip;
    }

    hideHoverInfo() {
        this.ele.querySelector('.header .info').innerHTML = '';
    }

    hideHoverTooltip() {
        let tooltip = this.ele.querySelector('.hmap-tt');
        tooltip.style.display = 'none';
        this.ele.querySelectorAll('.hover-box').forEach(el => el.remove());
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

        this.init(true); // resize init
        this.renderChart(true, true, true);
    }

    rowCatSort(category, dsc) {
        let catIdx = this.rowCatLabels.indexOf(category);

        // attach matrix rows to rows for sorting;
        this.rows.forEach((row, i) => {
            row.data = this.matrix[i];
            row.catColors = this.rowCatColors[i];
        });

        // sort rows
        this.rows.sort((a, b) => {
            if (dsc) return b.categories[catIdx].localeCompare(a.categories[catIdx]);
            return a.categories[catIdx].localeCompare(b.categories[catIdx]);
        });

        // get matrix and colors back
        this.matrix = this.rows.map(row => row.data);
        this.rowCatColors = this.rows.map(row => row.catColors);

        // update all data
        this.updateData(true);
    }

    // updates associated data models (such as categorical data
    updateData(render) {
        this.rowCategories = this.getCategories(this.rows);
        this.colCategories = this.getCategories(this.cols);

        // update colors
        this.colorMatrix = getColorMatrix(this.matrix, this.color);

        if (render) this.renderChart(true, true, true);
    }

    getCategories(objs) {
        objs = objs.filter(r => r.categories).map(r => {
            return r.categories;
        });

        return !objs.length ? null : objs;
    }

    updateLegend() {
        this.ele.querySelector('.legend').innerHTML = '';
        addLegend(this.ele.querySelector('.legend'),
            this.size.min, this.size.max, this.color);

        // optional color picker
        if (typeof Picker !== 'undefined')
        this.updateColorPicker();
    }

    updateColorPicker() {
        this.ele.querySelectorAll('.legend .item').forEach((el, i) => {
            new Picker({
                parent: el,
                popup: 'bottom',
                alpha: false,
                color: toHex(this.color.colors[i]),
                onChange: (color) => {
                    if (!color._rgba) return;
                    let hexD = parseInt( rgbToHex(color._rgba) );
                    this.color.colors[i] = hexD;
                    this.colorMatrix = getColorMatrix(this.matrix, this.color);
                    el.querySelector('.box').style.backgroundColor = '#' + toHex(hexD);
                    this.renderChart();
                },
                onClose: () => {
                    this.updateLegend();
                }
            });
        });
    }

    selectable() {
        let self = this;
        let box = {}; // i, j coordinates
        let drag = false;

        let scrollContainer = this.ele.querySelector('.scroll-container');

        if (this.SmouseDown) {
            scrollContainer.removeEventListener('mousedown', this.SmouseDown);
            scrollContainer.removeEventListener('mouseup', this.SmouseUp);
            scrollContainer.removeEventListener('mousemove', this.SmouseMove);
        }

        this.SmouseDown = (e) => {
            this.hideHoverTooltip();
            let _xPos = e.offsetX - scrollContainer.scrollLeft,
                _yPos = e.offsetY - scrollContainer.scrollTop;

            // relative position on visible cells
            let x = parseInt(_xPos / this.cellXDim),
                y = parseInt(_yPos / this.cellYDim);

            box.x = x;
            box.y = y;

            drag = true;
        };

        this.SmouseUp = () => {
            drag = false;

            let i = this.yStart + box.y,
                j = this.xStart + box.x;

            let i2 = i + box.h,
                j2 = j + box.w;

            // todo: fix these bounds
            if (isNaN(i) || isNaN(j) || isNaN(i2) || isNaN(j2))
                return;

            if (i2 < i || j2 < j) return;

            let selection = this.getSelection(i, j, i2, j2);

            alert(`Selected ${selection.length} cell(s)\n\n` +
                JSON.stringify(selection, null, 4).slice(0, 10000));

            box = {};
            this.svg.querySelectorAll('.select-box').forEach(e => e.remove());
        };

        this.SmouseMove = (e) => {
            if (drag) {
                let _xPos = e.offsetX - scrollContainer.scrollLeft,
                    _yPos = e.offsetY - scrollContainer.scrollTop;

                // relative position on visible cells
                let x = parseInt(_xPos / this.cellXDim),
                    y = parseInt(_yPos / this.cellYDim);


                box.w = x - box.x;
                box.h = y - box.y;

                this.Sdraw();
            }
        };

        this.Sdraw = () => {
            this.hideHoverTooltip();
            this.svg.querySelectorAll('.select-box').forEach(e => e.remove());

            let x = margin.left + box.x * this.cellXDim;
            let y = margin.top + box.y * this.cellYDim;

            let w = box.w < this.cellXDim
                ? ((box.w + 1) * this.cellXDim) : box.w * this.cellXDim;

            let h = box.h < this.cellYDim
                ? (box.h + 1) * this.cellYDim : box.h * this.cellYDim;

            if (w < 0 || h < 0) return;

            let rect = svgRect(x, y, w, h, {
                class: 'select-box',
                fill: 'rgba(0,0,0,0.1)'
            });
            self.svg.appendChild(rect);
        };

        scrollContainer.addEventListener('mousedown', this.SmouseDown, false);
        scrollContainer.addEventListener('mouseup', this.SmouseUp, false);
        scrollContainer.addEventListener('mousemove', this.SmouseMove, false);
    }

    getMatrixStats(matrix) {
        let minMax = matMinMax(matrix);
        return {
            x: this.matrix[0].length,
            y: this.matrix.length,
            min: minMax.min,
            max: minMax.max
        };
    }

    /**
     * API methods
     */
    update(data) {
        let {rows, cols, matrix} = data;
        this.cols = cols || this.cols;
        this.rows = rows || this.rows;
        this.matrix = matrix || this.matrix;

        this.size = this.getMatrixStats(this.matrix);

        this.updateData(true);
    }

    getState() {
        return {
            rows: this.rows,
            cols: this.cols,
            matrix: this.matrix
        };
    }

}


