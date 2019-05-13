/**
 * scale-ctrl.js
 *
 * Scale controllers for row/column width
 *
 * Authors: nconrad
 *
 * Todo: set min and max programmatically
 */
import lock from './assets/icons/lock.svg';
import lockOpen from './assets/icons/lock-open.svg';


export default class ScaleCtrl {
    constructor({ele, xValue, yValue, onXChange, onYChange, onLockClick}) {
        this.ele = ele;

        // set default values
        this.xValue = xValue;
        this.yValue = yValue;

        // events
        this.onXChange = onXChange;
        this.onYChange = onYChange;
        this.onLockClick = onLockClick;

        this._isLocked = false;

        this.init();
    }

    init() {
        let self = this;
        let scaleCtrls = this.ele.querySelector('.scale-ctrls');

        let xSlider = this._xSlider = scaleCtrls.querySelector('.x-slider');
        xSlider.value = this.xValue;
        xSlider.oninput = function() {
            let valObj = self.onXChange(parseInt(this.value), self._isLocked);
            self._setValues(valObj);
        };

        let ySlider = this._ySlider = scaleCtrls.querySelector('.y-slider');
        ySlider.value = this.yValue;
        ySlider.oninput = function() {
            let valObj = self.onYChange(parseInt(this.value), self._isLocked);
            self._setValues(valObj);
        };

        let lockBtn = scaleCtrls.querySelector('.lock-btn');
        lockBtn.innerHTML = lockOpen;
        lockBtn.addEventListener('click', () => {
            this._isLocked = !this._isLocked;
            let valObj = this.onLockClick(this._isLockOpen);
            this._setValues(valObj);
            lockBtn.innerHTML = this._isLocked ? lock : lockOpen;
        });
    }

    _setValues(valueObj) {
        this._xSlider.value = valueObj.x;
        this._ySlider.value = valueObj.y;
    }

    isLocked() {
        return this._isLocked;
    }
}
