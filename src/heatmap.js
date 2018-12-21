import 'pixi.js/dist/pixi.min';
import { getRandomColorMatrix } from './colors';

const margin = 100;
const rectSize = 20;
const xLength = 20;
const yLength = 20;
const colors = getRandomColorMatrix(xLength, yLength);


export default class Heamap {
    constructor({ele}) {
        this.ele = ele;

        this.start();
    }


    start() {
        let canvasWidth = window.innerWidth,
            canvasHeight = window.innerHeight;


        let renderer = new PIXI.autoDetectRenderer(canvasWidth, canvasHeight, {
            transparent: false,
            backgroundColor: '0xaaaaaa'
        });

        this.ele.appendChild(renderer.view);

        this.stage = new PIXI.Container();
        this.createChart();

        let render = () => {
            renderer.render(this.stage);
            requestAnimationFrame(render);
        };

        render();
    }

    createChart() {
        let stage = this.stage;
        let offSet = rectSize + 1;

        // for each column
        for (let i = 0; i < xLength; i++) {
            let x = margin + offSet * i;

            stage.addChild( this.createText(`This is column ${i}`, x + 2, margin - 10, -0.8) );

            // for each row
            for (let j = 0; j < yLength; j++) {
                let y = margin + offSet * j;

                let rect = this.createRect(x, y, rectSize, rectSize, colors[j][i]);
                stage.addChild(rect);

                if (i == 0)
                    stage.addChild( this.createText(`This is row ${j}`, margin - 10, y + 3, null, true) );
            }
        }
    }


    createText(text, x, y, rotation, alignRight) {
        let style = new PIXI.TextStyle({
            fontSize: 12,
            fill: '#000'
        });

        let obj = new PIXI.Text(text, style);

        if (alignRight) {
            let textWidth = PIXI.TextMetrics.measureText(text, style).width;
            obj.position.x = x - textWidth;
        } else {
            obj.position.x = x;
        }

        obj.position.y = y;
        obj.rotation = rotation || 0;

        return obj;
    }


    createRect(x, y, w, h, color) {
        let rect = new PIXI.Graphics();

        rect.beginFill(color);
        rect.interactive = true;
        rect.hitArea = new PIXI.Rectangle(x, y, w, h);
        rect.drawRect(x, y, w, w);

        rect.mouseover = function(ev) {
            this.alpha = 0.5;
        };

        rect.mouseout = function(ev) {
            this.alpha = 1;
        };

        return rect;
    }
}
