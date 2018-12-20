import 'pixi.js/dist/pixi.min';


const margin = 100;
const rectSize = 20;
const xLength = 20;
const yLength = 20;
const colors = getColors();


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


        let stage = new PIXI.Container();
        createChart();


        render();
        function render() {
            renderer.render(stage);
            requestAnimationFrame(render);
        }

        function createChart() {
            let offSet = rectSize + 1;

            // for each column
            for (let i = 0; i < xLength; i++) {
                let x = margin + offSet*i;

                stage.addChild( createText(`This is column ${i}`, x+2, margin - 10, -.8) );

                // for each row
                for (let j = 0; j < yLength; j++) {
                    let y = margin + offSet*j;

                    let rect = createRect(x, y, rectSize, rectSize, colors[j][i]);
                    stage.addChild(rect);

                    if (i == 0)
                        stage.addChild( createText(`This is row ${j}`, margin - 10, y+3, null, true) );
                }
            }

        }

        function createRect(x, y, w, h, color) {
            let rect = new PIXI.Graphics();

            rect.beginFill(color);
            rect.interactive = true;
            rect.hitArea = new PIXI.Rectangle(x, y, w, h);
            rect.drawRect(x, y, w, w);

            rect.mouseover = function(ev) {
                this.alpha = .5;
            }

            rect.mouseout = function(ev) {
                this.alpha = 1;
            }

            return rect;
        }


        function createText(text, x, y, rotation, alignRight) {
            let style = new PIXI.TextStyle({
                fontSize: 12,
                fill: "#000"
            });

            let obj = new PIXI.Text(text, style);

            if (alignRight) {
                let textWidth = PIXI.TextMetrics.measureText(text, style).width
                obj.position.x = x - textWidth;
            } else {
                obj.position.x = x
            }

            obj.position.y = y;
            obj.rotation = rotation || 0;

            return obj
        }
    }

}



function getColors() {
    let colors = []

    for (let i = 0; i < xLength; i++) {
        let row = []
        for (let j = 0; j < yLength; j++) {
            let color = '0x'+(Math.random()*0xFFFFFF<<0).toString(16);
            row.push(color);
        }
        colors.push(row)
    }
    return colors;
}