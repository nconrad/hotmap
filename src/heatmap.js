/**
 * heatmap.js
 *
 * Author: https://github.com/nconrad
 *
 * Todo:
 *      IE polyfill assign
 *      IE polyfill remove()/append()
 *      IE polyfill proxy
 *
 */
import * as PIXI from 'pixi.js';
import 'regenerator-runtime/runtime';

import container from './container.html';

import ScaleCtrl from './scale-ctrl';
import ScrollBox from './scroll-box';
import MouseTracker from './mouse-tracker';
import Options from './options';
import { addLegend } from './legend';
import { matMinMax } from './utils';
import { svgNS, svgG, svgRect, svgText } from './svg';
import { setAttributes } from './dom';
import { sanitizeColors, colorMatrix, categoryColors, rgbToHex, hexToHexColor } from './color';
import { transpose } from './matrix';


// import Picker from 'vanilla-picker';

import { labelColor, labelHoverColor } from './consts';
import './assets/styles/heatmap.less';

PIXI.utils.skipHello();

const PARTICLE_CONTAINER = false; // experimental

const NAME = `heatmap.js`;

// view size (in terms of size of matrix)
let yViewSize;
let xViewSize;

const cellXMin = 1;
const cellXMax = 100;
const zoomFactor = 0.1; // speed at which to zoom with mouse

// general chart settings
let margin = {
    top: 200,
    bottom: 150,
    left: 275,
    right: 125
};

const minTextW = 5;
const maxTextW = 16;
let rowCatWidth = 40;
let colCatWidth = 40;
// const cellPadding = 1;

// axis label offsets from the grid
const xAxisLabelOffset = 50;
const yAxisLabelOffset = 30;

export default class Heatmap {
    constructor(params) {
        Heatmap.validateParams(params);

        /**
         * BEGIN initialize params
         **/
        this.ele = params.ele;
        this.parent = this.ele.parentNode;

        this.rows = params.rows;
        this.cols = params.cols;
        this.matrix = params.matrix;
        this.newick = params.newick;

        this.defaults = params.defaults || {};

        this.color = params.color || 'gradient';
        this.origColorSettings = (typeof this.color === 'object')
            ? Object.assign(this.color, {
                bins: this.color.bins,
                colors: sanitizeColors(this.color.colors)
            }) : this.color;

        try {
            // convert values into colors
            this.colorMatrix = colorMatrix(this.matrix, this.color);
        } catch (error) {
            alert(error);
            return;
        }

        this.rowCategories = Heatmap.getCategories(params.rows);
        this.colCategories = Heatmap.getCategories(params.cols);
        if (!this.rowCategories) rowCatWidth = 0;
        if (!this.colCategories) colCatWidth = 0;

        // category labels
        this.rowCatLabels = params.rowCatLabels || [];
        this.colCatLabels = params.colCatLabels || [];

        // axis labels
        this.yLabel = params.rowsLabel || 'Rows';
        this.xLabel = params.colsLabel || 'Columns';

        this.onHover = params.onHover;
        this.onSelection = params.onSelection;
        this.onClick = params.onClick;
        this.onFSClick = params.onFullscreenClick;

        this.rowCatColors = this.rowCategories
            ? categoryColors(this.rowCategories) : [];

        Object.assign(margin, params.margin);
        this.noMargins = params.noMargins || false;
        /**
         * END initialize Params
         **/


        // m and n (row and cols) dimensions
        this.size = Heatmap.getMatrixStats(params.matrix);

        // start coordinates in matrix for "viewbox"
        this.xStart = 0;
        this.yStart = 0;

        // cell dimensions
        this.cellW;
        this.cellH;

        // current query for search input
        this.query;

        // components to be instantiated
        this.scaleCtrl;
        this.scrollBox;
        this.mouseTracker;

        // add container/html
        this.ele.innerHTML = container;
        if (params.noLogo == true)
            this.ele.querySelector('.logo').remove();
        if (params.theme == 'light')
            this.ele.querySelector('.header').classList.add('light');

        this.start();

        return this;
    }

    static validateParams(params) {
        let {ele, rows, cols, matrix} = params;

        // validate params
        if (!ele) alert(`${NAME}: Must provide an element to attach chart to.`);
        else if (!matrix) alert(`${NAME}: Must provide an matrix of values.`);
        else if (!rows) alert(`${NAME}: Must provide some sort of row labels.`);
        else if (!cols) alert(`${NAME}: Must provide some sort of column labels.`);

        let rowCatLbls = params.rowCatLabels;
        if (rowCatLbls !== null && !rowCatLbls && 'categories' in rows[0]) {
            console.warn(
                `${NAME}: No labels were provided for row categories.
                Use "rowCatLabels: null" to dismiss`
            );
        }

        let colCatLbls = params.colCatLabels;
        if (colCatLbls !== null && !colCatLbls && 'categories' in rows[0]) {
            console.warn(
                `${NAME}: No labels were provided for column categories.
                Use "colCatLabels: null" to dismiss`
            );
        }

        // validate data
        let validMat = matrix.filter(r => r.length !== matrix[0].length).length == 0;
        if (!validMat) alert('Must provide matrix with same number of columns.');
    }

    static getCategories(objs) {
        objs = objs.filter(r => r.categories).map(r => {
            return r.categories;
        });

        return !objs.length ? null : objs;
    }


    /**
     * Responsible for setup/instantiation of components
     */
    async start() {
        // base all positioning off of parent
        let [canvasWidth, canvasHeight] = this.getContainerSize();

        let obj = this.initSVGContainers(canvasWidth, canvasHeight);
        this.svg = obj.svg;
        this.xAxis = obj.xAxis;
        this.yAxis = obj.yAxis;
        this.cAxis = obj.cAxis;

        // initialize scale x/y width controls
        this.scaleCtrl = this.initScaleCtr();

        // setup search
        this.initSearch();

        // add scrollBox.  we'll update size of content area on each render
        this.scrollBox = this.initScrollBox();

        // add mouse tracker. we'll update the size of the area on render
        this.mouseTracker = this.initMouseTracker();

        // init legend
        this.updateLegend();

        // initialize options
        this.options = this.initOptions();

        // optional tree (experimental)
        if (this.newick) {
            const Tree = await import(/* webpackChunkName: "heatmap-tree" */ './tree.js');
            this.tree = new Tree.default({
                ele: this.ele,
                newick: this.newick,
                margin,
                width: margin.left - rowCatWidth - 30
            });

            margin.left = 400 + rowCatWidth + 50;
        }

        let renderer = Heatmap.getRenderer(canvasWidth, canvasHeight);
        this.renderer = renderer;

        this.initChart();

        // adjust canvas on resize
        let resizeTO;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTO);
            resizeTO = setTimeout(this.resize.bind(this), 100);
        });

        // start tracking sorting
        this.sorter(this.svg);
    }

    static getRenderer(width, height) {
        return new PIXI.Renderer({
            width,
            height,
            transparent: true
        });
    }

    initStage() {
        this.isStaged = false;
        this.draw(true, true);
        this.isStaged = true;
    }


    initChart({resize} = false) {
        if (this.ele.querySelector('.webgl-canvas canvas')) {
            this.ele.querySelector('.webgl-canvas canvas').remove();
        }

        this.ele.querySelector('.webgl-canvas')
            .appendChild(this.renderer.view);

        if (PARTICLE_CONTAINER) {
            this.cells = new PIXI.ParticleContainer(this.size.x * this.size.y, {
                position: true,
                scale: true,
                tint: true
            });
        } else {
            this.chart = new PIXI.Container();
            this.cells = new PIXI.Container();
            this.cats = new PIXI.Container();
            this.chart.addChild(this.cells);
            this.chart.addChild(this.cats);
        }

        // render is used by rAF when needed
        this.render = () => {
            this.renderer.render(this.chart);
        };

        // initial staging of 1x1 cells
        this.initStage();

        if (!resize) {
            this.cellW = this.defaults.cellWidth || this.computeCellWidth() || 1;
            this.cellH = this.defaults.cellHeight || this.computeCellHeight() || 1;
        }
        this.scaleCtrl.setPos(this.cellW, this.cellH);
        this.draw(true, true, true);
    }

    computeCellWidth() {
        return parseInt((this.parent.clientWidth - margin.left - margin.right) / this.size.x);
    }

    computeCellHeight() {
        return parseInt((this.parent.clientHeight - margin.top - margin.bottom) / this.size.y);
    }

    /**
     * todo: break into stage and update tint
     */
    draw(renderX, renderY, scale) {
        // let t0 = performance.now();
        this.clearStage(renderX, renderY, scale);

        let cellW, cellH;
        if (this.isStaged) {
            cellW = this.cellW;
            cellH = this.cellH;
        } else {
            cellW = 1;
            cellH = 1;
        }

        let xStart = this.xStart,
            yStart = this.yStart;

        // use cell size to compute "view box" of sorts
        // Todo: optimize, moving into resize event
        xViewSize = parseInt((this.parent.clientWidth - margin.left - margin.right) / cellW);
        yViewSize = parseInt((this.parent.clientHeight - margin.top - margin.bottom) / cellH);
        if (yViewSize > this.size.y) yViewSize = this.size.y;
        if (xViewSize > this.size.x) xViewSize = this.size.x;

        // for each row
        for (let i = 0; i < yViewSize; i++) {
            let y = margin.top + cellH * i;
            let rowIdx = yStart + i;

            if (renderY && cellH > minTextW && !this.tree) {
                this.addLabel('y', this.rows[rowIdx].name, margin.left - rowCatWidth - 10, y + 3, i);
            }
            if (renderY && this.rowCategories && rowIdx < this.size.y) {
                this.addCategories('y', rowIdx, margin.left - rowCatWidth, y);
            }

            // for each column
            for (let j = 0; j < xViewSize; j++) {
                let x = margin.left + cellW * j,
                    colIdx = xStart + j;

                // if sprites rendered, just making transformations
                if (this.isStaged) {
                    let sprite = this.cells.children[i * xViewSize + j];
                    sprite.tint = this.colorMatrix[rowIdx][colIdx];
                    sprite.visible = true;
                    sprite.position.set(x, y);
                    sprite.height = cellH;
                    sprite.width = cellW;
                } else {
                    let sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
                    sprite.position.set(x, y);
                    sprite.height = cellH;
                    sprite.width = cellW;
                    this.cells.addChild(sprite);
                }

                if (renderX && i == 0 && cellW > minTextW) {
                    this.addLabel('x', this.cols[colIdx].name, x + 2, margin.top - 5, j);
                }

                if (this.colCategories && !this.catLabelsAdded && i == 0 &&
                    renderX && colIdx < this.rowCatLabels.length) {
                    let k = this.rowCatLabels.length - colIdx - 1;
                    this.addCategoryLabel(
                        'x', this.rowCatLabels[k],
                        margin.left - colIdx * (colCatWidth / this.rowCatLabels.length),
                        margin.top - 5, k
                    );
                }
            }
        }

        /**
         * also adjust scrollBox if needed
         **/
        if (renderY || this.scaleCtrl.isLocked()) {
            this.scrollBox.setContentHeight(cellH * this.size.y );

            let height = yViewSize * cellH;
            this.scrollBox.setContainerHeight(height);

            // if y-axis is out-of-range, hide
            if (yViewSize >= this.size.y) {
                this.scrollBox.hideY();
            } else {
                this.scrollBox.showY();
            }
        }

        if (renderX || this.scaleCtrl.isLocked()) {
            this.scrollBox.setContentWidth(cellW * this.size.x);

            let width = xViewSize * cellW;
            this.scrollBox.setContainerWidth(width);

            // if x-axis is out-of-range
            if (xViewSize >= this.size.x) {
                this.scrollBox.hideX();
            } else {
                this.scrollBox.showX();
            }
        }

        this.mouseTracker.update({
            top: margin.top,
            left: margin.left,
            width: xViewSize * cellW,
            height: yViewSize * cellH,
            cellXSize: cellW,
            cellYSize: cellH
        });
        requestAnimationFrame(this.render); // draw
        this.catLabelsAdded = true;
        this.selectable();

        /**
         * exit now if first render
         **/
        if (!this.isStaged) return;

        // add axis labels if zoomed out
        if (cellW <= minTextW) this.showXAxisLabel(this.xLabel);
        else this.hideAxisLabel('x');

        if (cellH <= minTextW) this.showYAxisLabel(this.yLabel);
        else this.hideAxisLabel('y');

        // height any query matches
        if (this.query) this.highlightQuery();
        else this.rmHighlightQuery();


        if (this.tree && (renderY || scale)) {
            this.tree.setHeight(this.size.y * cellH)
        }

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
     * addLabel
     * @param {string} axis the axis to append to
     * @param {number} index the row or col index for the provided matrix
     * @param {number} x the x position of the text element
     * @param {number} y the y position of the text element
     * @param {number} cellIdx the row or col index in the "viewbox" the user sees
     *                    this is currently used for classes
     */
    addLabel(axis, text, x, y, cellIdx) {
        let ele = document.createElementNS(svgNS, 'text');

        if (axis == 'y') {
            y += this.cellH / 2 + 1;
            ele.setAttribute('font-size', `${this.cellH <= maxTextW ? this.cellH - 4 : 16}px`);
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

                let cats = !this.rowCategories || this.rowCatLabels.length == 0 ? ''
                    : this.rowCategories[cellIdx].map((cat, i) =>
                        `<div><b>${this.rowCatLabels[i]}:</b> ${cat}</div>`
                    ).join('');

                tt.innerHTML =
                    `<div>${this.rows[cellIdx].name}</div>
                    ${cats.length ? '<br>' + cats : cats}`;
            });

            ele.onclick = () => {
                if (!this.onSelection) return;
                let r = this.getRow(cellIdx);
                this.onSelection(r);
            };

        } else {
            x += this.cellW / 2 + 1;
            ele.innerHTML = text;
            ele.setAttribute('data-i', cellIdx);
            ele.setAttribute('font-size', `${this.cellW <= maxTextW ? this.cellW - 4 : 16}px`);
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

                let cats = !this.colCategories || this.colCatLabels.length === 0 ? ''
                    : this.colCategories[cellIdx].map((cat, i) =>
                        `<div><b>${this.colCatLabels[i]}:</b> ${cat}</div>`
                    ).join('');

                tt.innerHTML =
                    `<div>${this.cols[cellIdx].name}</div>
                    ${cats.length ? '<br>' + cats : cats}`;
            });

            ele.onclick = () => {
                if (!this.onSelection) return;
                let r = this.getCol(cellIdx);
                this.onSelection(r);
            };
        }

        ele.addEventListener('mouseout', this.hideHoverTooltip.bind(this));
    }

    highlightQuery() {
        let {cols, rows} = this.getViewboxLabels();

        let colMatches = cols.reduce((acc, col, i) => {
            if (col.name.toLowerCase().includes(this.query)) acc.push(true);
            else acc.push(false);
            return acc;
        }, []);

        this.rmHighlightQuery();
        colMatches.forEach((isMatch, i) => {
            if (!isMatch) return;

            let y = margin.top,
                x = margin.left + this.cellW * i;

            let h = this.cellW <= minTextW ? 10 : 1;
            this.svg.appendChild(
                svgRect(x, y - h - 2, this.cellW, h, {
                    class: 'search-match',
                    stroke: '#1187f1',
                    fill: '#1187f1'
                })
            );

            // if text is showing, highlight text
            if (this.cellW > minTextW) {
                this.highlightLabel(this.query, this.xAxis.querySelector(`[data-i="${i}"]`), i);
            }
        });
    }

    highlightLabel(text, ele, i) {
        let matchText = this.cols[i].name;
        let label = ele.innerHTML;
        let idx = label.toLowerCase().indexOf(text);

        // if not found, the match must be contained within ellipsis
        if (idx === -1) {
            let overlap = this.textOverlap(label, text);
            ele.innerHTML = label
                .replace(
                    overlap, `<tspan font-weight='bold' fill='#1187f1'>${overlap}</tspan>`
                ).replace(
                    '...', `<tspan font-weight='bold' fill='#1187f1'>...</tspan>`
                );
            return;
        }

        ele.innerHTML = label.slice(0, idx) +
            `<tspan font-weight='bold' fill='#1187f1'>` +
            label.slice(idx, idx + text.length) +
            `</tspan>` +
            label.slice(idx + text.length);
    }

    rmHighlightQuery() {
        // remove both the marker and the label highlighting
        this.ele.querySelectorAll('.search-match').forEach(el => el.remove());
        this.xAxis.querySelectorAll('text').forEach(el => {
            el.innerHTML = el.textContent;
        });
    }

    textOverlap(a, b) {
        if (b.length === 0) return '';
        if (a.endsWith(b)) return b;
        if (a.indexOf(b) !== -1) return b;
        return this.textOverlap(a, b.substring(0, b.length - 1));
    }

    getViewboxLabels() {
        return {
            cols: this.cols.slice(this.xStart, this.xStart + xViewSize),
            rows: this.rows.slice(this.yStart, this.yStart + yViewSize),
        };
    }

    showXAxisLabel(label) {
        let cls = 'x-axis-label';
        let ele = this.svg.querySelector(`.${cls}`);
        let x = margin.left + (xViewSize * this.cellW) / 2;

        // if label exists, just reuse/reposition
        if (ele) {
            ele.setAttribute('x', x);

            // text may change due to transpose
            if (label !== ele.innerHTML) {
                ele.innerHTML = label;
                ele.setAttribute('transform', `translate(-${ele.getBBox().width / 2})`);
            }
            return;
        }

        let y = margin.top - xAxisLabelOffset;
        let text = svgText(label, x, y, {
            class: cls,
            fill: '#666'
        });
        this.svg.appendChild(text);
        text.setAttribute('transform', `translate(-${text.getBBox().width / 2})`);
    }

    showYAxisLabel(label) {
        let cls = 'y-axis-label';
        let ele = this.svg.querySelector(`.${cls}`);
        let x = margin.left - yAxisLabelOffset - rowCatWidth;

        // if label exists, just reuse
        if (ele) {
            ele.innerHTML = label;
            let y = margin.top + (ele.getBBox().width / 2) + (yViewSize * this.cellH) / 2;
            ele.setAttribute('y', y);
            ele.setAttribute('transform', `rotate(-90, ${x}, ${y})`);
            return;
        }

        let y = margin.top + (yViewSize * this.cellH) / 2;
        let text = svgText(label, x, y, {
            class: cls,
            fill: '#666'
        });
        this.svg.appendChild(text);
        text.setAttribute('transform', `translate(-${text.getBBox().height / 2})`);
        text.setAttribute('transform', `rotate(-90, ${x}, ${y})`);
    }

    hideAxisLabel(axis) {
        if (!this.svg.querySelector(`.${axis}-axis-label`)) return;
        this.svg.querySelector(`.${axis}-axis-label`).remove();
    }

    getRow(i) {
        return this.matrix[i].map((val, j) => {
            let rowID = this.rows[i].id,
                colID = this.cols[j].id;
            return Object.assign({ name: this.cols[j].name, val }, { rowID, colID });
        });
    }

    getCol(j) {
        return this.matrix.map((val, i) => {
            let rowID = this.rows[i].id,
                colID = this.cols[j].id;
            return Object.assign({ name: this.rows[i].name, val: val[j] }, { colID, rowID });
        });
    }

    getSelection(i1, j1, i2, j2) {
        let selected = [];

        for (let i = i1; i <= i2; i++) {
            for (let j = j1; j <= j2; j++) {
                let val = this.matrix[i][j];
                let rowID = this.rows[i].id,
                    colID = this.cols[j].id;

                selected.push({
                    val: val,
                    rowName: this.rows[i].name,
                    colName: this.cols[j].name,
                    ...(rowID && {rowID}),
                    ...(colID && {colID}),
                    ...(this.rowCategories && {rowCats: this.rowCategories[i]}),
                    ...(this.colCategories && {colCats: this.colCategories[j]})
                });
            }
        }

        return selected;
    }

    addCategoryLabel(axis, text, x, y, idx) {
        if (this.isTransposed) {
            console.warn(`${NAME}: flipAxis does not (currently) support categories.`);
            return;
        }

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
        if (this.isTransposed) {
            console.warn(`${NAME}: flipAxis does not yet support categories.`);
            return;
        }

        let categories = this.rowCategories[index];
        // compute width of each category from: total / number-of-cateogries
        let width = parseInt(rowCatWidth / categories.length );

        for (let i = 0; i < categories.length; i++) {
            let sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
            sprite.tint = this.rowCatColors[index][i];
            sprite.x = x;
            sprite.y = y;
            sprite.height = this.cellH;
            sprite.width = width - 1; // -1 spacing

            this.cats.addChild(sprite);
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

            let i = this.cats.children.length;
            while (i--) {
                this.cats.removeChild(this.cats.children[i]);
            };
        }

        // Todo: there's possibly some sort of optimization here
        // when cells are out of range
        if (clearStage) {
            for (let i = 0; i < this.cells.children.length; i++) {
                this.cells.children[i].visible = false;
            }
        }
    }

    onHorizontalScroll(xStart) {
        this.xStart = xStart;
        this.draw(true);
    }

    onVerticalScroll(yStart) {
        this.yStart = yStart;
        this.draw(false, true);
    }

    initScaleCtr() {
        let scaleCtrl = new ScaleCtrl({
            ele: this.ele,
            x: this.cellW,
            y: this.cellH,
            onXChange: (val, isLocked) => {
                this.cellW = val;
                if (isLocked) {
                    this.cellH = val;
                    this.draw(true, true, true);
                } else {
                    this.draw(true, false, true);
                }
                return {x: this.cellW, y: this.cellH};
            },
            onYChange: (val, isLocked) => {
                this.cellH = val;
                if (isLocked) {
                    this.cellW = val;
                    this.draw(true, true, true);
                } else {
                    this.draw(false, true, true);
                }
                return {x: this.cellW, y: this.cellH};
            },
            onLockClick: lockOpen => {
                let x = this.cellW,
                    y = this.cellH;

                if (y > x)
                    this.cellW = y;
                else
                    this.cellH = x;

                this.draw(true, true, true);

                return {x: this.cellW, y: this.cellH};
            }
        });

        let [w, h] = this.getContainerSize();
        scaleCtrl.fullWindow(w, h, this.parent, () => {
            if (this.onFSClick) this.onFSClick();
            this.resize();
        });

        return scaleCtrl;
    }

    initScrollBox() {
        return new ScrollBox({
            ele: this.ele,
            x: margin.left,
            y: margin.top,
            width: xViewSize,
            height: yViewSize,
            contentWidth: this.cellW * this.size.x,
            contentHeight: this.cellH * this.size.y,
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
                let newXDim = this.cellW - deltaY * zoomFactor;
                this.cellW = newXDim < cellXMin
                    ? cellXMin : (newXDim > cellXMax ? cellXMax : newXDim);

                this.draw(true, null, true);

                // update controls
                this.scaleCtrl.setPos(this.cellW, this.cellH);
            }
        });
    }

    initMouseTracker() {
        return new MouseTracker({
            ele: this.ele.querySelector('.scroll-container'),
            top: margin.top,
            left: margin.left,
            width: xViewSize * this.cellW,
            height: yViewSize * this.cellH,
            cellXSize: this.cellW,
            cellYSize: this.cellH,
            m: this.size.y,
            n: this.size.x,
            onCellMouseOver: (pos) => this.onCellMouseOver(pos),
            onCellMouseOut: () => this.onCellMouseOut()
        });
    }

    initSearch() {
        let self = this;
        let searchInput = this.ele.querySelector('.search');

        searchInput.onkeyup = function() {
            self.query = this.value.toLowerCase();
            self.draw();
        };
    }

    initOptions() {
        return new Options({
            parentNode: this.parent,
            openBtn: document.querySelector('.opts-btn'),
            color: this.color,
            onColorChange: (type) => {
                this.color = type === 'gradient' ? type : this.origColorSettings;
                this.colorMatrix = colorMatrix(this.matrix, this.color);

                // change legend
                this.updateLegend();
                this.draw();
            }
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
            label.setAttribute('font-weight', '500');
        }

        // if there even is x axis labels and we're changing cells
        if (this.xAxis.childNodes.length && x !== oldX) {
            let label;
            if (oldX !== -1 && oldX < xViewSize) {
                label = this.xAxis.querySelector(`[data-i="${oldX}"]`);
                label.setAttribute('fill', labelColor);
                label.setAttribute('font-weight', 'normal');
            }
            label = this.xAxis.querySelector(`[data-i="${x}"]`);
            label.setAttribute('fill', labelHoverColor);
            label.setAttribute('font-weight', '500');
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
        let cellW = this.cellW,
            cellH = this.cellH;

        x = margin.left + x * cellW;
        y = margin.top + y * cellH;

        let content =
            `<b>Row:</b> ${yLabel}<br>` +
            `<b>Column:</b> ${xLabel}<br>` +
            `<b>Value:</b> ${value}`;

        this.ele.querySelector('.header .info').innerHTML = content;

        let top = y + cellH,
            left = x + cellW;
        let tooltip = this.tooltip(top, left);

        let rowCats = this.rowCategories,
            colCats = this.colCategories;

        tooltip.innerHTML = this.onHover ? this.onHover({
            xLabel, yLabel, value,
            ...(rowCats && {rowCategories: this.rowCategories[i]}),
            ...(colCats && {colCategories: this.colCategories[j]})
        }) : content;

        // add hover box
        if (x && y) {
            this.ele.querySelectorAll('.hover-box').forEach(el => el.remove());
            this.svg.appendChild( svgRect(x, y, cellW, cellH, {class: 'hover-box'}) );
        }
    }

    tooltip(top, left) {
        let tooltip = this.ele.querySelector('.hmap-tt');
        tooltip.style.display = 'block';
        tooltip.style.top = `${top}px`;
        tooltip.style.left = `${left}px`;
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
        return [this.parent.clientWidth, this.parent.clientHeight];
    }

    resize() {
        let [canvasWidth, canvasHeight] = this.getContainerSize();

        this.renderer.resize(canvasWidth, canvasHeight);
        this.svg.setAttribute('width', canvasWidth);
        this.svg.setAttribute('height', canvasHeight);

        this.initChart({resize: true});
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
        this.updateData();
        this.draw(true, true, true);
    }

    // updates associated data models (such as categorical data)
    updateData() {
        this.rowCategories = Heatmap.getCategories(this.rows);
        this.colCategories = Heatmap.getCategories(this.cols);

        // update colors
        this.colorMatrix = colorMatrix(this.matrix, this.color);
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
                color: hexToHexColor(this.color.colors[i]),
                onChange: (color) => {
                    if (!color._rgba) return;

                    let hexD = parseInt( rgbToHex(color._rgba) );
                    this.color.colors[i] = hexD;
                    this.colorMatrix = colorMatrix(this.matrix, this.color);
                    el.querySelector('.box').style.backgroundColor = hexToHexColor(hexD);
                    this.draw();
                }
            });
        });
    }

    selectable() {
        let box = {};
        let drag = false;

        let scrollContainer = this.ele.querySelector('.scroll-container');

        if (this.selectDown) {
            scrollContainer.removeEventListener('mousedown', this.selectDown);
            scrollContainer.removeEventListener('mouseup', this.selectUp);
            scrollContainer.removeEventListener('mousemove', this.selectMove);
        }

        this.selectDown = (e) => {
            this.hideHoverTooltip();
            let _xPos = e.offsetX - scrollContainer.scrollLeft,
                _yPos = e.offsetY - scrollContainer.scrollTop;

            // relative position on visible cells
            let x = parseInt(_xPos / this.cellW),
                y = parseInt(_yPos / this.cellH);

            // save start of box
            box.x = x;
            box.y = y;

            drag = true;
        };

        this.selectMove = (e) => {
            if (!drag) return;

            let _xPos = e.offsetX - scrollContainer.scrollLeft,
                _yPos = e.offsetY - scrollContainer.scrollTop;

            // todo: this is a hack to deal with hovering
            // where the scrollBox normally would be
            if (_xPos < 0 || _yPos < 0) return;

            // relative position on visible cells
            let x2 = parseInt(_xPos / this.cellW),
                y2 = parseInt(_yPos / this.cellH);

            if (y2 >= yViewSize) y2 = yViewSize;
            if (x2 >= xViewSize) x2 = xViewSize;

            // save end of box (allowing any direction)
            box.x2 = x2;
            box.y2 = y2;

            box.w = Math.abs(x2 - box.x);
            box.h = Math.abs(y2 - box.y);

            selectDraw();
        };

        this.selectUp = () => {
            drag = false;

            // otherwise, compute selection
            let i, j;
            if (box.x2 < box.x) i = this.yStart + box.y2;
            else i = this.yStart + box.y;

            if (box.y2 < box.y) j = this.xStart + box.x2;
            else j = this.xStart + box.x;

            // if width is not set, then this is actually a 'click' event
            if (!box.h && box.h != 0 && this.onClick
                && ('x' in box && 'y' in box)) {
                this.onClick(this.getSelection(i, j, i, j)[0]);
            }

            let i2 = i + box.h,
                j2 = j + box.w;

            let selection = this.getSelection(i, j, i2, j2);

            // Fixme: this is a hack for scrollbar event triggering
            if (selection.length == 0) return;

            if (this.onSelection) {
                this.onSelection(selection);
            }

            box = {};
            this.svg.querySelectorAll('.select-box').forEach(e => e.remove());
        };

        let selectDraw = () => {
            this.hideHoverTooltip();
            this.svg.querySelectorAll('.select-box').forEach(e => e.remove());

            // don't bother drawing if there's no callback
            if (!this.onSelection) return;

            // convert x and y to top left coordinates if needed
            let x, y;
            if (box.x2 < box.x) x = box.x2;
            else x = box.x;

            if (box.y2 < box.y) y = box.y2;
            else y = box.y;

            // compute size of box
            x = margin.left + x * this.cellW;
            y = margin.top + y * this.cellH;
            let w = box.w < this.cellW
                ? (box.w + 1) * this.cellW : box.w * this.cellW;
            let h = box.h < this.cellH
                ? (box.h + 1) * this.cellH : box.h * this.cellH;

            let rect = svgRect(x, y, w, h, {
                class: 'select-box',
                stroke: 'rgb(14, 135, 241)',
                fill: 'rgba(14, 135, 241, .1)'
            });
            this.svg.appendChild(rect);
        };

        scrollContainer.addEventListener('mousedown', this.selectDown, false);
        scrollContainer.addEventListener('mouseup', this.selectUp, false);
        scrollContainer.addEventListener('mousemove', this.selectMove, false);
    }

    static getMatrixStats(matrix) {
        let minMax = matMinMax(matrix);
        return {
            x: matrix[0].length,
            y: matrix.length,
            min: minMax.min,
            max: minMax.max
        };
    }

    /**
     * API methods
     */
    update(data) {
        this.cols = data.cols || this.cols;
        this.rows = data.rows || this.rows;
        this.matrix = data.matrix || this.matrix;
        this.xLabel = data.colsLabel || this.xLabel;
        this.yLabel = data.rowsLabel || this.yLabel;

        this.size = Heatmap.getMatrixStats(this.matrix);

        // need to update scrollBox
        this.scrollBox.setMaxes(this.size.x, this.size.y);
        this.scrollBox.setPos(0, 0);

        this.updateData();
        this.initChart({resize: true});
    }

    getState() {
        return {
            rows: this.rows,
            cols: this.cols,
            matrix: this.matrix
        };
    }

    flipAxis() {
        this.isTransposed = !this.isTransposed;

        // flip scaling
        let ctrl = this.scaleCtrl;
        ctrl.setPos(ctrl.y, ctrl.x);
        let cellW = this.cellW;
        this.cellW = this.cellH;
        this.cellH = cellW;

        // transpose all the things
        this.update({
            rows: this.cols,
            cols: this.rows,
            matrix: transpose(this.matrix),
            rowsLabel: this.xLabel,
            colsLabel: this.yLabel
        });
    }

}


