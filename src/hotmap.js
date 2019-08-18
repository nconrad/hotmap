/**
 * hotmap.js
 *
 * Author: https://github.com/nconrad
 *
 */
import * as PIXI from 'pixi.js';
import 'proxy-polyfill/proxy.min';
import 'regenerator-runtime/runtime';
import FontFaceObserver from 'fontfaceobserver';

import container from './container.html';

import ScaleCtrl from './scale-ctrl';
import ScrollBox from './scroll-box';
import MouseTracker from './mouse-tracker';
import Options from './options';
import { legend } from './legend';
import { matMinMax } from './utils';
import { svgNS, svgG, createSVG, svgRect, svgText, svgLine } from './svg';
import { setAttributes } from './dom';
import { sanitizeColors, colorMatrix, categoryColors, rgbToHex, hexToHexColor } from './color';
import { transpose } from './matrix';

// import Picker from 'vanilla-picker';
import { labelColor, labelHoverColor } from './consts';
import './assets/styles/hotmap.less';

PIXI.utils.skipHello();

const NAME = `hotmap.js`;
const PARTICLE_CONTAINER = false; // experimental

// view size (in terms of size of matrix)
let yViewSize;
let xViewSize;

const cellMin = 1;      // min height/width for a cell
const cellMax = 50;     // max height/width for a cell
const zoomFactor = 0.1; // speed at which to zoom with mouse

/*
 * margin defaults
 */
const margin = {
    top: 185,
    bottom: 150,
    left: 185,
    right: 125
};

// API defaults
const maxFontSize = 18;  // largest possible font size (pixels)
const textPadding = 4;   // padding between text
const useBoundingClient = false;

// other defaults
const minTextW = 5;      // show text if cell is at least this big
const yTextPad = 10;     // padding from y axis
const xTextPad = 5;      // padding from x axis
const textMargin = 20;   // margin left and top of text

let xTextSpace;
let yTextSpace;

const yMetaSize = 15;    // size of y axis meta column
const xMetaSize = 15;    // size of x axis meta row
const metaSpacing = 1;
const metaFontSize = 14;

// axis label offsets from the grid
const xAxisLabelOffset = 50;
const yAxisLabelOffset = 30;

export default class Hotmap {
    constructor(params) {
        Hotmap.validateParams(params);

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

        this.yMeta = Hotmap.getMeta(params.rows);
        this.xMeta = Hotmap.getMeta(params.cols);

        // meta labels
        this.yMetaLabels = params.rowMetaLabels || [];
        this.xMetaLabels = params.colMetaLabels || [];

        // hidden meta
        this.hideYMeta = params.hideRowMeta;
        this.hideXMeta = params.hideColMeta;

        // axis labels
        this.yLabel = params.rowsLabel || 'Rows';
        this.xLabel = params.colsLabel || 'Columns';

        // events
        this.onHover = params.onHover;
        this.onSelection = params.onSelection;
        this.onClick = params.onClick;
        this.onFSClick = params.onFullscreenClick;

        if (!this.hideYMeta) {
            this.rowCatColors = this.yMeta
                ? categoryColors(this.yMeta) : [];
        }

        // other options
        this.opts = Object.assign({
            textPadding, maxFontSize, useBoundingClient
        }, params.options);

        /**
         * END initialize Params
         **/

        this.ele.innerHTML = container;
        this.headerSize = this.ele.querySelector('.header').clientHeight;

        this.init().then(() => {
            this.start();
        }, () => this.start());

        return this;
    }

    static validateParams(params) {
        let {ele, rows, cols, matrix} = params;

        // validate params
        if (!ele) alert(`${NAME}: Must provide an element to attach chart to.`);
        else if (!matrix) alert(`${NAME}: Must provide an matrix of values.`);
        else if (!rows) alert(`${NAME}: Must provide some sort of row labels.`);
        else if (!cols) alert(`${NAME}: Must provide some sort of column labels.`);

        let yMetaLabels = params.rowMetaLabels;
        if (yMetaLabels !== null && !yMetaLabels && 'meta' in rows[0]) {
            console.warn(
                `${NAME}: No labels were provided for row categories.
                Use "yMetaLabels: null" to dismiss`
            );
        }

        let xMetaLabels = params.colMetaLabels;
        if (xMetaLabels !== null && !xMetaLabels && 'meta' in rows[0]) {
            console.warn(
                `${NAME}: No labels were provided for column categories.
                Use "xMetaLabels: null" to dismiss`
            );
        }

        // validate data
        let validMat = matrix.filter(r => r.length !== matrix[0].length).length == 0;
        if (!validMat) alert('Must provide matrix with same number of columns.');
    }

    init() {
        // handle basic options
        if (this.opts.theme == 'light')
            this.ele.querySelector('.header').classList.add('light');
        if (this.opts.showVersion)
            this.ele.querySelector('.version').classList.remove('hidden');
        if (this.opts.showVersion)
            this.ele.querySelector('.version').classList.remove('hidden');
        if (this.opts.optionsLabel)
            this.ele.querySelector('.opts-label').innerHTML = this.opts.optionsLabel;
        if (this.opts.hideOptions)
            this.ele.querySelector('.opts-btn').remove();

        if (this.opts.legend) {
            this.opts.hideLegend = true;
            this.ele.querySelector('.legend').innerHTML = this.opts.legend;
        } else if (this.opts.hideLegend)
            this.ele.querySelector('.legend-container').remove();


        // m and n (row and cols) dimensions
        this.size = Hotmap.getMatrixStats(this.matrix);

        // start coordinates in matrix for "viewbox"
        this.xStart = 0;
        this.yStart = 0;

        // cell dimensions
        this.cellW;
        this.cellH;

        // minimize margins
        if (!this.opts.useMargins) {
            margin.bottom = 16;
            margin.right = 16;
        }

        // dimensions for meta
        this.yMetaWidth = this.yMeta && !this.hideYMeta
            ? this.yMeta[0].length * yMetaSize : 0;
        this.xMetaHeight = this.xMeta && !this.hideXMeta
            ? this.xMeta[0].length * xMetaSize : 0;

        // include meta size in margins
        margin.left = margin.left + this.yMetaWidth;
        xTextSpace = margin.top - this.xMetaHeight - xTextPad - textMargin;
        yTextSpace = margin.left - yTextPad - this.yMetaWidth - textMargin;

        // current query for search input
        this.query;

        // components to be instantiated
        this.scaleCtrl;
        this.scrollBox;
        this.mouseTracker;

        let style = window.getComputedStyle(this.ele.querySelector('.hotmap'));
        this.font = style.fontFamily.split(',')[0].replace(/"/g, '');

        // wait for font if needed
        if (this.opts.waitForFont) {
            let fontProm = new FontFaceObserver(this.font);
            return fontProm.load();
        } else {
            return Promise.resolve();
        }
    }

    static getMeta(objs) {
        objs = objs.filter(r => r.meta).map(r => r.meta);
        return objs.length ? objs : null;
    }


    /**
     * Responsible for setup/instantiation of components
     */
    async start() {
        // base all positioning off of parent
        let [width, height] = this.getContainerSize();

        let svgContainer = this.ele.querySelector('.svg-canvas');
        let obj = this.initSVGContainers(svgContainer, width, height);
        this.svg = obj.svg;
        this.xAxis = obj.xAxis;
        this.yAxis = obj.yAxis;
        this.cAxis = obj.cAxis;
        this.scratchCanvas = obj.scratchCanvas;

        // initialize scale x/y width controls
        this.scaleCtrl = this.initScaleCtr();

        // setup search
        this.initSearch();

        // add scrollBox.  we'll update size of content area on each render
        this.scrollBox = this.initScrollBox();

        // add mouse tracker. we'll update the size of the area on render
        this.mouseTracker = this.initMouseTracker();

        // init legend
        if (!this.opts.hideLegend) this.updateLegend();

        // initialize options
        if (!this.opts.hideOptions)
            this.options = this.initOptions();

        // optional tree (experimental)
        if (this.newick) {
            const Tree = await import(/* webpackChunkName: "hotmap-tree" */ './tree.js');
            this.tree = new Tree.default({
                ele: this.ele,
                newick: this.newick,
                margin,
                width: margin.left - this.yMetaWidth - 30
            });

            margin.left = 400 + this.yMetaWidth + 50;
        }

        let renderer = Hotmap.getRenderer(width, height);
        this.renderer = renderer;

        this.initChart(true);

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


    initChart(firstInit) {
        let canvas = this.ele.querySelector('.webgl-canvas canvas');
        if (canvas) canvas.remove();

        this.ele.querySelector('.webgl-canvas')
            .appendChild(this.renderer.view);

        if (PARTICLE_CONTAINER) {
            this.cells = new PIXI.ParticleContainer(this.size.n * this.size.m, {
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

        if (firstInit) {
            // we only need to compute cell dimensions on first init
            this.cellW = this.defaults.cellWidth || this.computeCellWidth();
            this.cellH = this.defaults.cellHeight || this.computeCellHeight();
        }
        this.scaleCtrl.setPos(this.cellW, this.cellH);
        this.draw(true, true, true);
    }

    computeCellWidth() {
        if (this.size.size > 250000) return 5;

        let [width, _] = this.getContainerSize();
        let w = parseInt((width - margin.left - margin.right) / this.size.n);
        return w < cellMax ? (w || 1) : cellMax;
    }

    computeCellHeight() {
        if (this.size.n * this.size.m > 250000) return 5;

        let [_, height] = this.getContainerSize();
        let h = parseInt((height - margin.top - margin.bottom) / this.size.m);
        return h < cellMax ? (h || 1) : cellMax;
    }


    /**
     * Computes labels based on fonts, and stores in rows/cols
     * We use canvas to avoid slowness in dom rendering
     */
    shortenLabel(fontSize, text, width) {
        let ctx = this.scratchCanvas;
        let fontStr = `${fontSize}px ${this.font}`;
        ctx.font = fontStr;

        let origLen = text.length;
        let len = text.length;
        while (true) {
            if (ctx.measureText(text.slice(0, len)).width < width) break;
            len -= 5;
            if (len < 1) break;
        }

        if (origLen !== len) {
            text = text.slice(0, len) + '...';
        }

        return text;
    }

    /**
     * main rendering function
     * @param {bool} renderX should render x axis
     * @param {bool} renderY should render y axis
     * @param {bool} scale should rescale (zoom / update cell dimensions)
     */
    draw(renderX, renderY, scale) {
        this.clearStage(renderX, renderY, scale);

        // we'll compute the "viewsize" based on current container size;
        let [width, height] = this.getContainerSize();

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
        // Todo: optimize, moving into resize event?
        xViewSize = parseInt((width - margin.left - margin.right) / cellW);
        yViewSize = parseInt((height - margin.top - margin.bottom) / cellH);
        if (yViewSize > this.size.m) yViewSize = this.size.m;
        if (xViewSize > this.size.n) xViewSize = this.size.n;

        // for each row
        for (let i = 0; i < yViewSize; i++) {
            let y = margin.top + cellH * i;
            let rowIdx = yStart + i;

            // enforce bounds when scrolled and scaling
            if (rowIdx >= this.size.m) break;

            if (renderY && cellH >= minTextW && !this.tree) {
                this.drawYLabel(
                    this.yAxis, this.rows[rowIdx].name,
                    margin.left - this.yMetaWidth - yTextPad, y + 3, i
                );
            }
            if (renderY && this.yMeta && rowIdx < this.size.m && !this.hideYMeta) {
                this.addCategories('y', rowIdx, margin.left - this.yMetaWidth, y);
            }

            // for each column
            for (let j = 0; j < xViewSize; j++) {
                let x = margin.left + cellW * j,
                    colIdx = xStart + j;

                // enforce bounds when scrolled and scaling
                if (colIdx >= this.size.n) break;

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

                if (renderX && i == 0 && cellW >= minTextW) {
                    this.drawXLabel(this.xAxis, this.cols[colIdx], x + 2, margin.top - xTextPad, j);
                }

                if (this.yMeta && !this.catLabelsAdded && i == 0 &&
                    renderX && colIdx < this.yMetaLabels.length && !this.hideYMeta) {
                    let k = this.yMetaLabels.length - colIdx - 1;
                    this.addCategoryLabel(
                        'x', this.yMetaLabels[k],
                        margin.left - colIdx * (yMetaSize + metaSpacing) - yMetaSize / 2,
                        margin.top - 5, k
                    );
                }
            }
        }

        /**
         * also adjust scrollBox if needed
         **/
        if (renderY || this.scaleCtrl.isLocked()) {
            this.scrollBox.setContentHeight(cellH * this.size.m);

            let h = yViewSize * cellH;
            this.scrollBox.setContainerHeight(h);

            // if y-axis is out-of-range, hide
            if (yViewSize >= this.size.m) {
                this.scrollBox.hideY();
            } else {
                this.scrollBox.showY();
            }
        }

        if (renderX || this.scaleCtrl.isLocked()) {
            this.scrollBox.setContentWidth(cellW * this.size.n);

            let w = xViewSize * cellW;
            this.scrollBox.setContainerWidth(w);

            // if x-axis is out-of-range
            if (xViewSize >= this.size.n) {
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

        // render!
        requestAnimationFrame(this.render);
        this.catLabelsAdded = true;

        if (this.onSelection) this.selectable();

        /**
         * exit now if first render
         **/
        if (!this.isStaged) return;

        // enable row/column drag and drop
        if (renderY || scale) this.yAxisHover();
        if (renderX || scale) this.xAxisHover();

        // add axis labels if zoomed out
        if (cellW <= minTextW) this.showXAxisLabel(this.xLabel);
        else this.hideAxisLabel('x');

        if (cellH <= minTextW) this.showYAxisLabel(this.yLabel);
        else this.hideAxisLabel('y');

        // height any query matches
        if (this.query) this.highlightQuery();
        else this.rmHighlightQuery();

        // experimental tree
        if (this.tree && (renderY || scale)) {
            this.tree.setHeight(this.size.m * cellH);
        }
    }

    initSVGContainers(el, width, height) {
        let svg = createSVG();
        svg.style.position = 'absolute';
        svg.style.top = 0;
        svg.style.left = 0;
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);

        let xAxis = document.createElementNS(svgNS, 'g');
        xAxis.setAttribute('class', 'x-axis');
        xAxis.style.height = `${margin.top - 50}px`;

        let yAxis = document.createElementNS(svgNS, 'g');
        yAxis.setAttribute('class', 'y-axis');

        let cAxis = document.createElementNS(svgNS, 'g');
        cAxis.setAttribute('class', 'cat-axis');
        cAxis.style.height = `${margin.top - 50}px`;

        svg.appendChild(xAxis);
        svg.appendChild(yAxis);
        svg.appendChild(cAxis);
        el.appendChild(svg);

        // create hidden scratch canvas for measuring text size
        let canvas = this.ele.appendChild(document.createElement('canvas'));
        canvas.style.display = 'none';
        let scratchCanvas = canvas.getContext('2d');

        return {svg, xAxis, yAxis, cAxis, scratchCanvas};
    }

    /**
     * drawYLabel
     * @param {string} svgEl the svg element (<g> usually) to append to
     * @param {string} text text to add to svgEL
     * @param {number} x the x position of the text element
     * @param {number} y the y position of the text element
     * @param {number} cellIdx the row or col index in the "viewbox" the user sees
     *                    this is currently used for classes
     */
    drawYLabel(svgEl, text, x, y, cellIdx) {
        let ele = document.createElementNS(svgNS, 'text');

        y += this.cellH / 2 + 1;
        let fontSize = this.cellH - this.opts.textPadding;
        fontSize = fontSize <= this.opts.maxFontSize ? fontSize : this.opts.maxFontSize;
        ele.setAttribute('font-size', `${fontSize}px`);
        ele.setAttribute('class', `row-${cellIdx}`);
        ele.setAttribute('fill', '#666');
        ele.setAttribute('x', x);
        ele.setAttribute('y', y);
        svgEl.appendChild(ele);

        ele.innerHTML = this.shortenLabel(fontSize, text, yTextSpace);

        let width = ele.getBBox().width;
        ele.setAttribute('transform', `translate(-${width})`);
    }

    drawXLabel(svgEl, obj, x, y, cellIdx) {
        let ele = document.createElementNS(svgNS, 'text');

        x += parseInt(this.cellW / 2 + 2);

        let fontSize = this.cellW - this.opts.textPadding;
        fontSize = fontSize <= this.opts.maxFontSize ? fontSize : this.opts.maxFontSize;
        ele.setAttribute('data-i', cellIdx);
        ele.setAttribute('font-size', `${fontSize}px`);
        ele.setAttribute('fill', '#666');
        ele.setAttribute('x', x);
        ele.setAttribute('y', y);
        svgEl.appendChild(ele);

        let width = ele.getBBox().width;
        ele.setAttribute('transform', `translate(-${width})`);

        ele.innerHTML = this.shortenLabel(fontSize, obj.name, xTextSpace);

        if (this.opts.useMargins) {
            ele.setAttribute('transform', `rotate(-45, ${x}, ${y})`);
        } else {
            ele.setAttribute('transform', `rotate(-90, ${x}, ${y})`);
        }
    }

    highlightQuery() {
        let {cols, rows} = this.getViewboxLabels();

        let colMatches = cols.reduce((acc, col, i) => {
            if (col.name.toLowerCase().includes(this.query.q)) acc.push(true);
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
                    'class': 'search-match',
                    stroke: '#1187f1',
                    fill: '#1187f1'
                })
            );

            // if text is showing, highlight text
            if (this.cellW > minTextW) {
                this.highlightLabel(this.query.q, this.xAxis.querySelector(`[data-i="${i}"]`), i);
            }
        });
    }

    highlightLabel(text, ele, i) {
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
            'class': cls,
            fill: '#666'
        });
        this.svg.appendChild(text);
        text.setAttribute('transform', `translate(-${text.getBBox().width / 2})`);
    }

    showYAxisLabel(label) {
        let cls = 'y-axis-label';
        let ele = this.svg.querySelector(`.${cls}`);
        let x = margin.left - this.yMetaWidth - yAxisLabelOffset - yMetaSize;

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
            'class': cls,
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
                    ...(this.yMeta && {yMeta: this.yMeta[i]}),
                    ...(this.xMeta && {xMeta: this.xMeta[j]})
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
        ele.innerHTML = text;

        x += metaFontSize / 3;
        setAttributes(ele, {
            'class': `cat-label`,
            'data-idx': idx,
            'data-name': text,
            'font-size': `${metaFontSize}px`,
            'fill': '#666',
            'x': x,
            'y': y
        });
        g.appendChild(ele);
        this.cAxis.appendChild(g);

        let width = ele.getBBox().width;
        ele.setAttribute('transform', `translate(-${width})`);
        ele.setAttribute('transform', `rotate(-90, ${x}, ${y})`);

        ele.onclick = () => {
            this.sortModel[text] = this.sortModel[text] == 'asc' ? 'dsc' : 'asc';
        };
    }

    addCategories(axis, index, x, y) {
        if (this.isTransposed) {
            console.warn(`${NAME}: flipAxis does not yet support categories.`);
            return;
        }

        let categories = this.yMeta[index];

        // compute width of each category from: total / number-of-cateogries
        let width = yMetaSize;

        for (let i = 0; i < categories.length; i++) {
            let sprite = new PIXI.Sprite(PIXI.Texture.WHITE);
            sprite.tint = this.rowCatColors[index][i];
            sprite.x = x;
            sprite.y = y;
            sprite.height = this.cellH;
            sprite.width = width - metaSpacing; // -1 spacing

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
                    label.innerHTML = this.yMetaLabels[idx];
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

    scrollTo(xStart, yStart) {
        if (xStart !== null && yStart !== null) {
            this.xStart = xStart;
            this.yStart = yStart;
            this.draw(true, true);
        } else if (xStart !== null) {
            this.xStart = xStart;
            this.draw(true);
        } else if (yStart !== null) {
            this.yStart = yStart;
            this.draw(false, true);
        }
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
        scaleCtrl.fullscreen(w, h, this.parent, () => {
            this.scrollBox.setPos(0, 0);
            [this.xStart, this.yStart] = [0, 0];

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
            contentWidth: this.cellW * this.size.n,
            contentHeight: this.cellH * this.size.m,
            xMax: this.size.n,
            yMax: this.size.m,
            onMove: (xPos, yPos) => {
                this.scrollTo(xPos, yPos);
                this.hideHoverEffects();
            },
            onMouseWheel: change => {
                let {deltaY} = change;

                this.hideHoverEffects();
                // update cell size
                let newXDim = this.cellW - deltaY * zoomFactor;
                this.cellW = newXDim < cellMin
                    ? cellMin : (newXDim > cellMax ? cellMax : newXDim);

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
            m: this.size.m,
            n: this.size.n,
            onCellMouseOver: (pos) => this.onCellMouseOver(pos),
            onCellMouseOut: () => this.onCellMouseOut()
        });
    }

    initSearch() {
        let self = this;
        let searchInput = this.ele.querySelector('.search');
        let searchCount = this.ele.querySelector('.search-count');
        let reset = this.ele.querySelector('.reset-btn');

        searchInput.onkeyup = function() {
            let q = this.value.toLowerCase();

            if (!q.length) {
                self.query = null;
            } else {
                self.query = {
                    q: q,
                    count: self.cols.filter(c => c.name.toLowerCase().includes(q)).length
                };
            }

            // display count
            if (self.query) {
                searchCount.innerHTML = `${self.query.count} results`;
                reset.classList.remove('hidden');
            } else {
                searchCount.innerHTML = '';
                reset.classList.add('hidden');
            }

            self.draw();
        };

        reset.onclick = function() {
            self.query = null;
            reset.classList.add('hidden');
            searchInput.value = '';
            searchCount.innerHTML = '';
            self.draw();
        };
    }

    initOptions() {
        return new Options({
            parentNode: this.parent,
            openBtn: document.querySelector('.opts-btn'),
            color: this.color,
            altColors: this.origColorSettings != 'gradient' &&
             ('altColors' in this.origColorSettings),
            onColorChange: (type) => {
                this.color = type === 'gradient' ? type : this.origColorSettings;
                this.colorMatrix = colorMatrix(this.matrix, this.color);

                // change legend
                this.updateLegend();
                this.draw();
            },
            onSnapshot: () => this.downloadSVG(),
            onFullSnapshot: () => this.downloadSVG({full: true})

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

        // this.hideHoverInfo();
        this.hideHoverEffects();
    }

    setHoverInfo(xLabel, yLabel, value, i, j, x, y) {
        let cellW = this.cellW,
            cellH = this.cellH;

        x = margin.left + x * cellW;
        y = margin.top + y * cellH;

        // default content
        let content =
            `<b>row:</b> ${yLabel}<br>` +
            `<b>column:</b> ${xLabel}<br>` +
            `<b>value:</b> ${value}`;

        let yMeta = this.yMeta,
            xMeta = this.xMeta;

        content = this.onHover ? this.onHover({
            xLabel, yLabel, value,
            ...(yMeta && {rowMeta: this.yMeta[i]}),
            ...(xMeta && {colMeta: this.xMeta[j]})
        }) : content;


        // place at bottom-right (if possible)
        let top = y,
            left = x;

        this.tooltip(content, top, left, {w: cellW, h: cellH});

        // add hover box
        if (x && y) {
            this.ele.querySelectorAll('.hover-box').forEach(el => el.remove());
            this.svg.appendChild(svgRect(x, y, cellW, cellH, {
                'class': 'hover-box',
                stroke: '#000000'
            }));
        }
    }

    tooltip(content, top, left, offset = {w: 0, h: 0}) {
        let {w, h} = offset;
        let [width, height] = this.getContainerSize();
        let wDiff = width - left;

        let tooltip = this.ele.querySelector('.hmap-tt');
        tooltip.style.display = 'block';
        tooltip.innerHTML = content;

        left = wDiff > 200 ? left + w : left - tooltip.clientWidth;
        top = top + h + tooltip.offsetHeight < height
            ? top + h : top - tooltip.clientHeight;

        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;

        return tooltip;
    }

    hideHoverEffects() {
        // hide tooltip
        let tooltip = this.ele.querySelector('.hmap-tt');
        tooltip.style.display = 'none';

        // remove cursor hover square
        this.ele.querySelectorAll('.hover-box').forEach(el => el.remove());

        // hide any hover/drag boxes on axes
        this.ele.querySelector('.x-drag-box').style.display = 'none';
        this.ele.querySelector('.y-drag-box').style.display = 'none';
    }

    getContainerSize() {
        return [
            this.parent.clientWidth,
            this.parent.clientHeight - this.headerSize
        ];
    }

    resize() {
        let [canvasWidth, canvasHeight] = this.getContainerSize();

        this.renderer.resize(canvasWidth, canvasHeight);
        this.svg.setAttribute('width', canvasWidth);
        this.svg.setAttribute('height', canvasHeight);

        this.initChart();
    }

    rowCatSort(category, dsc) {
        let catIdx = this.yMetaLabels.indexOf(category);

        // attach matrix rows to rows for sorting;
        this.rows.forEach((row, i) => {
            row.data = this.matrix[i];
            row.catColors = this.rowCatColors[i];
        });

        // sort rows
        this.rows.sort((a, b) => {
            if (dsc) return b.meta[catIdx].localeCompare(a.meta[catIdx]);
            return a.meta[catIdx].localeCompare(b.meta[catIdx]);
        });

        // get matrix and colors back
        this.matrix = this.rows.map(row => row.data);
        this.rowCatColors = this.rows.map(row => row.catColors);

        // update all data
        this.updateData();
        this.draw(true, true, true);
    }

    // updates associated data models (such as meta data)
    updateData() {
        this.yMeta = Hotmap.getMeta(this.rows);
        this.xMeta = Hotmap.getMeta(this.cols);

        if (!this.hideYMeta) {
            this.rowCatColors = this.yMeta
                ? categoryColors(this.yMeta) : [];
        }

        // update colors
        this.colorMatrix = colorMatrix(this.matrix, this.color);
    }

    updateLegend() {
        this.ele.querySelector('.legend').innerHTML =
            legend(this.size.min, this.size.max, this.color);

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


    yAxisHover() {
        this.dragging = false;
        let captureWidth = margin.left - this.yMetaWidth;

        // use/update existing capture boxes if they exist
        let dragBox = this.ele.querySelector('.y-drag-box'); // already in dom
        let axisBox = this.ele.querySelector('.y-axis-hover-box');
        if (axisBox) {
            axisBox.style.height = `${yViewSize * this.cellH}px`;
            dragBox.style.height = `${this.cellH}px`;
        } else {
            // otherwise create a capture box
            axisBox = document.createElement('div');
            axisBox.className = 'y-axis-hover-box';
            axisBox.style.top = `${margin.top}px`;
            axisBox.style.width = `${captureWidth}px`;
            axisBox.style.height = `${yViewSize * this.cellH}px`; // updated on render
            this.ele.querySelector('.chart').appendChild(axisBox);

            // and prepare dragbox
            dragBox.style.width = `${captureWidth}px`;
            dragBox.style.height = `${this.cellH}px`;
        }

        axisBox.onmousemove = evt => {
            // only activate hover when text is reasonable size
            if (this.cellH < minTextW) return;

            // we'll need y position based on cell heights
            let rowIdx = this.yMousePosToRowIdx(evt);
            let yPos = this.cellPosYToMousePosY(rowIdx);

            // update drag box position
            dragBox.style.display = 'block';
            dragBox.style.top = `${yPos}px`;
            let fontSize = this.cellH - this.opts.textPadding;
            fontSize = fontSize <= this.opts.maxFontSize ? fontSize : this.opts.maxFontSize;

            // show icon as well
            let top = this.cellH / 2 - fontSize / 2;
            let iconHeight = this.cellH > maxFontSize ? maxFontSize : this.cellH;
            let icon = this.ele.querySelector('.y-drag-icon'); // already in dom
            icon.className = 'y-drag-icon';
            let svg = icon.querySelector('svg');
            svg.setAttribute('height', iconHeight);

            dragBox.innerHTML =
                `<div class="y-drag-icon-container" style="margin-top: ${top}px;">` + icon.innerHTML + `</div>` +
                `<div class="y-drag-text" style="font-size: ${fontSize}px; margin-top: ${top}px; padding-right: ${textPadding}px;">` +
                    this.yAxis.querySelector(`.row-${rowIdx}`).innerHTML +
                `</div>`;

            // build tooltip
            let cats = !this.yMeta || this.yMetaLabels.length == 0 ? ''
                : this.yMeta[rowIdx].map((cat, i) =>
                    `<div><b>${this.yMetaLabels[i]}:</b> ${cat}</div>`
                ).join('');

            let text = `<div>${this.rows[rowIdx].name}</div>
                ${cats.length ? '<br>' + cats : cats}`;

            this.tooltip(text, yPos, captureWidth);
        };

        let row1;
        let row2;
        dragBox.ondragstart = (evt) => {
            dragBox.classList.add('dragging');
            this.dragging = true;
            row1 = this.yMousePosToRowIdx(evt);
        };

        dragBox.ondrag = (evt) => {
            if (!this.dragging) return;
            this.svg.querySelectorAll('.drag-line').forEach(el => el.remove());

            // compute the position of the current row
            let currentRow = this.yMousePosToRowIdx(evt);

            // draw bottom line
            let lineWidth = margin.left + this.yMetaWidth + xViewSize * this.cellW;
            let y2Pos = this.cellPosYToMousePosY(currentRow) + this.cellH;
            let bottomLine = svgLine(0, y2Pos, lineWidth, y2Pos, {
                'class': 'drag-line',
                stroke: '#333'
            });

            this.svg.appendChild(bottomLine);

            // update state
            if (currentRow < 0) return;
            row2 = currentRow;
        };

        dragBox.ondragend = () => {
            this.svg.querySelectorAll('.drag-line').forEach(el => el.remove());
            this.dragging = false;
            dragBox.style.display = 'none';
            dragBox.classList.remove('dragging');
            this.moveRow(row1 + this.yStart, row2 + this.yStart);
        };

        dragBox.onclick = (evt) => {
            if (!this.onSelection) return;

            let rowIdx = this.yMousePosToRowIdx(evt);
            let r = this.getRow(this.yStart + rowIdx);
            this.onSelection(r);
        };

        dragBox.onmouseleave = () => this.hideHoverEffects();
    }


    xAxisHover() {
        this.dragging = false;
        let captureHeight = margin.top - this.xMetaHeight;

        // use/update existing capture boxes if they exist
        let dragBox = this.ele.querySelector('.x-drag-box'); // already in dom
        let axisBox = this.ele.querySelector('.x-axis-hover-box');
        if (axisBox) {
            axisBox.style.width = `${xViewSize * this.cellW}px`;
            dragBox.style.width = `${this.cellW}px`;
        } else {
            // otherwise create a capture box
            axisBox = document.createElement('div');
            axisBox.className = 'x-axis-hover-box';
            axisBox.style.left = `${margin.left}px`;
            axisBox.style.height = `${captureHeight}px`;
            axisBox.style.width = `${xViewSize * this.cellW}px`; // updated on render
            this.ele.querySelector('.chart').appendChild(axisBox);

            // and prepare dragbox
            dragBox.style.height = `${captureHeight}px`;
            dragBox.style.width = `${this.cellW}px`;
        }

        axisBox.onmousemove = evt => {
            // only activate hover when text is reasonable size
            if (this.cellW < minTextW) return;

            let colIdx = this.xMousePosToColIdx(evt);

            // need y position based on cell heights
            let xPos = this.cellPosXToMousePosX(colIdx);

            // update drag box position
            dragBox.style.display = 'block';
            dragBox.style.left = `${xPos}px`;
            let fontSize = this.cellW - this.opts.textPadding;
            fontSize = fontSize <= this.opts.maxFontSize ? fontSize : this.opts.maxFontSize;

            // show icon as well
            let left = this.cellW / 2 + fontSize / 2;
            let iconWidth = this.cellW > maxFontSize ? maxFontSize : this.cellW;
            let icon = this.ele.querySelector('.x-drag-icon'); // already in dom
            icon.className = 'x-drag-icon';
            let svg = icon.querySelector('svg');
            svg.setAttribute('width', iconWidth);

            dragBox.innerHTML =
                `<div class="x-drag-icon-container" style="left: ${this.cellW / 2 - iconWidth / 2}px">` + icon.innerHTML + `</div>` +
                `<div class="x-drag-text" style="bottom: ${xTextPad}px; left: ${left}px; font-size: ${fontSize}px;">` +
                    this.xAxis.querySelector(`[data-i="${colIdx}"]`).innerHTML +
                `</div>`;

            // build tooltip
            let cats = !this.xMeta || this.xMetaLabels.length == 0 ? ''
                : this.xMeta[colIdx].map((cat, i) =>
                    `<div><b>${this.xMetaLabels[i]}:</b> ${cat}</div>`
                ).join('');

            let text = `<div>${this.cols[colIdx].name}</div>
                ${cats.length ? '<br>' + cats : cats}`;

            this.tooltip(text, captureHeight, xPos);
        };


        let col1,
            col2;
        dragBox.ondragstart = (evt) => {
            dragBox.classList.add('dragging');
            this.dragging = true;

            col1 = this.xMousePosToColIdx(evt);
        };

        dragBox.ondrag = (evt) => {
            if (!this.dragging) return;
            this.svg.querySelectorAll('.drag-line').forEach(el => el.remove());

            // we'll need current col position
            let currentCol = this.xMousePosToColIdx(evt);

            // draw bottom line
            let lineHeight = margin.top + this.xMetaHeight + yViewSize * this.cellH;
            let xPos = this.cellPosXToMousePosX(currentCol);
            let bottomLine = svgLine(xPos, 0, xPos, lineHeight, {
                'class': 'drag-line',
                stroke: '#333'
            });

            this.svg.appendChild(bottomLine);

            // update state
            if (currentCol < 0) return
            col2 = currentCol;
        };

        dragBox.ondragend = () => {
            this.svg.querySelectorAll('.drag-line').forEach(el => el.remove());
            this.dragging = false;
            dragBox.style.display = 'none';
            dragBox.classList.remove('dragging');
            this.moveCol(col1 + this.xStart, col2 + this.xStart);
        };

        dragBox.onclick = (evt) => {
            if (!this.onSelection) return;

            let colIdx = this.xMousePosToColIdx(evt);
            let col = this.getCol(this.xStart + colIdx);
            this.onSelection(col);
        };

        dragBox.onmouseleave = () => this.hideHoverEffects();
    }

    // new
    yMousePosToRowIdx(evt) {
        let y = evt.pageY - (this.opts.useBoundingClient
            ? this.ele.getBoundingClientRect().y : this.ele.offsetTop);
        return parseInt((y - margin.top - this.headerSize ) / this.cellH);;
    }

    xMousePosToColIdx(evt) {
        let x = evt.pageX - (this.opts.useBoundingClient
            ? this.ele.getBoundingClientRect().x : this.ele.offsetLeft);
        return parseInt((x - margin.left) / this.cellW);;
    }

    cellPosYToMousePosY(rowIdx) {
        return margin.top + rowIdx * this.cellH;
    }

    cellPosXToMousePosX(colIdx) {
        return margin.left + colIdx * this.cellW;
    }

    mousePosToCellPos(x, y) {
        return {
            x: parseInt(x / this.cellW),
            y: parseInt(y / this.cellH)
        };
    }

    selectable() {
        let box = {};
        let drag = false;

        let scrollContainer = this.ele.querySelector('.scroll-container');

        scrollContainer.onmousedown = (e) => {
            this.hideHoverEffects();
            const _x = e.offsetX - scrollContainer.scrollLeft,
                _y = e.offsetY - scrollContainer.scrollTop;

            // need cell position
            const {x, y} = this.mousePosToCellPos(_x, _y);

            // save start of box
            box.x = x;
            box.y = y;

            drag = true;
        };

        scrollContainer.onmousemove = (e) => {
            if (!drag) return;

            let _x = e.offsetX - scrollContainer.scrollLeft,
                _y = e.offsetY - scrollContainer.scrollTop;

            // todo: this is a hack to deal with hovering
            // where the scrollBox normally would be
            if (_x < 0 || _y < 0) return;

            // need cell position
            let {x, y} = this.mousePosToCellPos(_x, _y);

            if (y > yViewSize - 1) y = yViewSize - 1;
            if (x > xViewSize - 1) x = xViewSize - 1;

            // save end of box (allowing any direction)
            box.x2 = x;
            box.y2 = y;
            box.w = Math.abs(x - box.x);
            box.h = Math.abs(y - box.y);

            let countEl = this.ele.querySelector('.select-count');
            let count = (box.w + 1) * (box.h + 1);
            countEl.innerHTML = `${count} selected`;

            selectDraw();
        };

        scrollContainer.onmouseup = () => {
            drag = false;

            // otherwise, compute selection
            let i, j;
            if (box.x2 < box.x) i = this.yStart + box.y2;
            else i = this.yStart + box.y;

            if (box.y2 < box.y) j = this.xStart + box.x2;
            else j = this.xStart + box.x;

            // if width is not set, then this is actually a 'click' event
            if (!box.h && box.h != 0 && this.onClick &&
                ('x' in box && 'y' in box)) {
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
            this.ele.querySelector('.select-count').innerHTML = '';
        };

        let selectDraw = () => {
            this.hideHoverEffects();
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
                'class': 'select-box',
                stroke: 'rgb(14, 135, 241)',
                fill: 'rgba(14, 135, 241, .1)'
            });
            this.svg.appendChild(rect);
        };
    }

    static getMatrixStats(matrix) {
        let minMax = matMinMax(matrix),
            m = matrix.length,
            n = matrix[0].length;

        return {
            m, n,
            size: m * n,
            min: minMax.min,
            max: minMax.max
        };
    }

    snapshot(fullChart) {
        // need to use hidden, rendered div for text widths
        let div = document.createElement('div');
        div.style.visibility = 'hidden';
        document.body.appendChild(div);

        let width, height;
        if (fullChart) {
            width = margin.left + this.size.n * this.cellW + margin.right;
            height = margin.top + this.size.m * this.cellH + margin.bottom;
        } else {
            [width, height] = this.getContainerSize();
        }

        let {svg, xAxis, yAxis, cAxis} = this.initSVGContainers(div, width, height);

        // draw cells
        let cellW = this.cellW,
            cellH = this.cellH;

        let xStart = fullChart ? 0 : this.xStart,
            yStart = fullChart ? 0 : this.yStart;

        let xSize = fullChart ? this.size.n : xViewSize,
            ySize = fullChart ? this.size.m : yViewSize;

        // for each row
        for (let i = 0; i < ySize; i++) {
            let y = margin.top + cellH * i;
            let rowIdx = yStart + i;

            if (cellH >= minTextW && !this.tree) {
                this.drawYLabel(yAxis, this.rows[rowIdx].name, margin.left - this.yMetaWidth - 10, y, i);
            }

            // add row categories and category labels
            if (this.yMeta && rowIdx < this.size.m) {
                let categories = this.yMeta[rowIdx];
                let width = yMetaSize;
                let x = margin.left - this.yMetaWidth;
                for (let i = 0; i < categories.length; i++) {
                    let color = this.rowCatColors[rowIdx][i];
                    let rect = svgRect(x, y, width - 1, cellH, { fill: hexToHexColor(color) });
                    svg.appendChild(rect);
                    x += width;
                }
            }

            // for each column
            for (let j = 0; j < xSize; j++) {
                let x = margin.left + cellW * j,
                    colIdx = xStart + j;

                if (i == 0 && cellW >= minTextW) {
                    this.drawXLabel(xAxis, this.cols[colIdx], x + 2, margin.top - 5, j);
                }

                let color = this.colorMatrix[rowIdx][colIdx];
                let rect = svgRect(x, y, cellW, cellH, { fill: hexToHexColor(color) });
                svg.appendChild(rect);
            }
        }

        // add axis labels if needed
        let xLabel = this.ele.querySelector(`.x-axis-label`);
        let yLabel = this.ele.querySelector(`.y-axis-label`);
        if (cellW < minTextW && xLabel) svg.appendChild(xLabel.cloneNode(true));
        if (cellH < minTextW && yLabel) svg.appendChild(yLabel.cloneNode(true));

        // add category labels if needed
        if (this.yMeta) svg.appendChild(this.cAxis.cloneNode(true));

        div.remove();
        return svg;
    }

    saveSVG(svgEl, name) {
        // see https://stackoverflow.com/q/23218174
        svgEl.setAttribute('xmlns', svgNS);
        let svgData = svgEl.outerHTML;
        let preface = '<?xml version="1.0" standalone="no"?>\r\n';
        let svgBlob = new Blob([preface, svgData], {type: 'image/svg+xml;charset=utf-8'});
        let svgUrl = URL.createObjectURL(svgBlob);
        let downloadLink = document.createElement('a');
        downloadLink.href = svgUrl;
        downloadLink.download = name;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
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

        this.size = Hotmap.getMatrixStats(this.matrix);

        // need to update scrollBox
        this.scrollBox.setMaxes(this.size.n, this.size.m);
        this.scrollBox.setPos(0, 0);
        [this.xStart, this.yStart] = [0, 0];

        this.updateData();
        this.initChart();
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
        [this.cellW, this.cellH] = [this.cellH, this.cellW];

        // transpose all the things
        this.update({
            rows: this.cols,
            cols: this.rows,
            matrix: transpose(this.matrix),
            rowsLabel: this.xLabel,
            colsLabel: this.yLabel
        });
    }

    downloadSVG({fileName = 'hotmap.svg', full} = {}) {
        let svg = this.snapshot(full);
        this.saveSVG(svg, fileName);
    }

    // moves row1 to row2 (by index)
    moveRow(row1, row2) {
        let rowToMove = this.rows[row1];
        let matrixRowToMove = this.matrix[row1];

        // update rows
        this.rows.splice(row1, 1);
        this.rows.splice(row2, 0, rowToMove);

        // update matrix
        this.matrix.splice(row1, 1);
        this.matrix.splice(row2, 0, matrixRowToMove);

        this.updateData();
        this.initChart();
    }


    // moves column1 to column2 (by index)
    moveCol(col1, col2) {
        let colToMove = this.cols[col1];

        // update rows
        this.cols.splice(col1, 1);
        this.cols.splice(col2, 0, colToMove);

        // update matrix
        this.rows.forEach((_, i) => {
            let matrixValToMove = this.matrix[i][col1];
            this.matrix[i].splice(col1, 1);
            this.matrix[i].splice(col2, 0, matrixValToMove);
        });

        this.updateData();
        this.initChart();
    }
}


