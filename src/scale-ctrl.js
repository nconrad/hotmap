
export default class ScaleCtrl {
    constructor({ele, xValue, yValue, onXChange, onYChange}) {
        this.ele = ele;

        // set default value
        this.xValue = xValue;
        this.yValue = yValue;
        this.onXChange = onXChange;
        this.onYChange = onYChange;

        this.init();
    }

    init() {
        let self = this;

        let xSlider = this.ele.querySelector('.x-slider');

        xSlider.value = this.xValue;
        xSlider.oninput = function() {
            self.onXChange(parseInt(this.value));
        };

        let ySlider = this.ele.querySelector('.y-slider');
        ySlider.value = this.yValue;
        ySlider.oninput = function() {
            self.onYChange(parseInt(this.value));
        };
    }
}
