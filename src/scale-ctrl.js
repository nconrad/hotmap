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
    constructor({ele, x, y, onXChange, onYChange, onLockClick}) {
        this.ele = ele;

        // set default values
        this.x = x;
        this.y = y;

        // events
        this.onXChange = onXChange;
        this.onYChange = onYChange;
        this.onLockClick = onLockClick;

        this._xSlider;
        this._ySlider;
        this._isLocked = false;

        this.init();
    }

    init() {
        let self = this;
        let scaleCtrls = this.ele.querySelector('.scale-ctrls');

        let xSlider = this._xSlider = scaleCtrls.querySelector('.x-slider');
        xSlider.value = this.x;
        xSlider.oninput = function() {
            let {x, y} = self.onXChange(parseInt(this.value), self._isLocked);
            self.setPos(x, y);
        };

        let ySlider = this._ySlider = scaleCtrls.querySelector('.y-slider');
        ySlider.value = this.y;
        ySlider.oninput = function() {
            let {x, y} = self.onYChange(parseInt(this.value), self._isLocked);
            self.setPos(x, y);
        };

        let lockBtn = scaleCtrls.querySelector('.lock-btn');
        lockBtn.innerHTML = lockOpen;
        lockBtn.addEventListener('click', () => {
            this._isLocked = !this._isLocked;
            let {x, y} = this.onLockClick(this._isLockOpen);
            self.setPos(x, y);
            lockBtn.innerHTML = this._isLocked ? lock : lockOpen;
        });
    }

    setPos(x, y) {
        this._xSlider.value = this.x = x;
        if (y) this._ySlider.value = this.y = y;
    }

    isLocked() {
        return this._isLocked;
    }
}
