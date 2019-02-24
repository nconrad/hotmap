import Heatmap from './heatmap';

export default class PerfLegacy extends Heatmap {

    createRectSprite(x, y, w, h, val, data) {
        let sprite = new PIXI.Sprite.from('../src/assets/red-box.png');
        sprite.x = x;
        sprite.y = y;
        sprite.height = h;
        sprite.width = w;
        sprite.alpha = val;
        this.stage.addChild(sprite);
    }

    createRectGraphic(x, y, w, h, val, data) {
        let self = this;
        let g = new PIXI.Graphics();

        g.beginFill(boxColor);

        g.hitArea = new PIXI.Rectangle(x, y, w, h);
        g.interactive = true;
        g.drawRect(x, y, w, h);
        g.alpha = val;
        g.endFill();


        g.mouseover = function(ev) {
            self.labels.x[data.j].fontWeight = 'bold';
            self.labels.y[data.i].fontWeight = 'bold';
        };

        g.mouseout = function(ev) {
            self.labels.x[data.j].fontWeight = 'normal';
            self.labels.y[data.i].fontWeight = 'normal';
        };

        this.stage.addChild(g);
    }

    renderChartGraphics() {
        // space between boxes
        let xOffSet = boxXLength,
            yOffSet = boxYLength;

        let xStart = this.xStart,
            yStart = this.yStart;

        // for each row
        for (let i = 0; i < yViewSize; i++) {
            let y = margin.top + yOffSet * i;
            let rowIdx = yStart + i;

            this.createLabel(this.labelNames.y[rowIdx], margin.top - 10, y + 3, null, 'y');

            // for each column
            for (let j = 0; j < xViewSize; j++) {
                let x = margin.top + xOffSet * j,
                    colIdx = xStart + j;

                this.createRect(x, y, boxXLength, boxYLength, this.matrix[rowIdx][colIdx], {i, j});

                if (i == 0) {
                    this.createLabel(this.labelNames.x[colIdx], x + 2, margin.top - 10, -0.8, 'x');
                }
            }
        }
    }

    createLabelDeprecated(text, x, y, rotation, axis) {
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
}


PIXI.loader.add('redCell', spritePath).load((ldr, resources) => {
    this.sprites = resources;
});

/*
let i = this.stage.children.length;
while (i--) {
    if (this.stage.children[i].pluginName == 'sprite')
        this.stage.removeChild(this.stage.children[i]);
};
*/