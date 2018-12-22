import 'pixi.js/dist/pixi.min';

import template from './container.html';

import ScaleCtrl from './scale-ctrl'
import { getRandomColorMatrix } from './colors';

// manually set framerate (ms) - for testing
// requestAnimationFrame is used if not set
const FRAME_RATE = null;

const margin = {top: 150, left: 200};
let boxXLength = 20;
let boxYLength = 20;
const xLength = 15;
const yLength = 15;
const colors = getRandomColorMatrix(xLength, yLength);


export default class Heamap {
    constructor({ele}) {
        this.ele = ele;
        this.ele.innerHTML = template;

        this.rects = [];
        this.labels = {x: [], y: []};

        this.start();
    }


    start() {
        let canvasWidth = window.innerWidth,
            canvasHeight = window.innerHeight;

        let renderer = new PIXI.autoDetectRenderer(canvasWidth, canvasHeight, {
            transparent: false,
            backgroundColor: '0xf2f2f2'
        });

        this.ele.querySelector('.chart')
            .appendChild(renderer.view);

        let stage = this.stage = new PIXI.Container();
        this.renderChart();

        let render = () => {
            renderer.render(this.stage);
            if (!FRAME_RATE) requestAnimationFrame(render);
        };

        if (FRAME_RATE) { setInterval(render, FRAME_RATE); }

        render();

        // initialize scale x/y width controls
        new ScaleCtrl({
            ele: this.ele,
            onXChange: val => {
                this.clearStage();
                boxXLength = val;
                this.renderChart();
            },
            onYChange: val => {
                this.clearStage();
                boxYLength = val;
                this.renderChart();
            },
        });
    }

    renderChart() {
        let xOffSet = boxXLength + 1,
            yOffSet = boxYLength + 1;

        // for each column
        for (let i = 0; i < xLength; i++) {
            let x = margin.left + xOffSet * i;

            this.createLabel(`This is column ${i}`, x + 2, margin.top - 10, -0.8, 'x');

            // for each row
            for (let j = 0; j < yLength; j++) {
                let y = margin.top + yOffSet * j;

                this.createRect(x, y, boxXLength, boxYLength, colors[j][i], {i, j});

                if (i == 0) {
                    this.createLabel(`This is row ${j}`, margin.left - 10, y + 3, null, 'y');
                }
            }
        }
    }


    createLabel(text, x, y, rotation, axis) {
        let style = new PIXI.TextStyle({
            fontSize: 12,
            fill: '#000000'
        });

        let g = new PIXI.Text(text, style);

        if (axis === 'y') {
            let textWidth = PIXI.TextMetrics.measureText(text, style).width;
            g.position.x = x - textWidth;
        } else {
            g.position.x = x;
        }

        g.position.y = y;
        g.rotation = rotation || 0;

        this.labels[axis].push(style);
        this.stage.addChild(g);
    }


    createRect(x, y, w, h, color, data) {
        let self = this;
        let g = new PIXI.Graphics();

        g.beginFill(color);
        g.hitArea = new PIXI.Rectangle(x, y, w, h);
        g.interactive = true;
        g.drawRect(x, y, w, h);

        g.mouseover = function(ev) {
            this.alpha = 0.5;
            self.labels.x[data.i].fontWeight = 'bold';
            self.labels.y[data.j].fontWeight = 'bold';
        };

        g.mouseout = function(ev) {
            this.alpha = 1;
            self.labels.x[data.i].fontWeight = 'normal';
            self.labels.y[data.j].fontWeight = 'normal';
        };

        this.rects.push(g);
        this.stage.addChild(g);
    }

    clearStage() {
        // Todo: perf test
        this.labels = {x: [], y: []};

        let i = this.stage.children.length;
        while (i--) {
            this.stage.removeChild(this.stage.children[i]);
        };
    }
}
