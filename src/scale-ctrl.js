
export default class ScaleCtrl {
    constructor({ele, onXChange, onYChange}) {
        this.ele = ele;

        this.onXChange = onXChange;
        this.onYChange = onYChange;

        this.init();
    }


    init() {
        let self = this;

        let xSlider = this.ele.querySelector('.x-slider');
        xSlider.oninput = function() {
            self.onXChange(parseInt(this.value));
        };

        let ySlider = this.ele.querySelector('.y-slider');
        ySlider.oninput = function() {
            self.onYChange(parseInt(this.value));
        };
    }

}
