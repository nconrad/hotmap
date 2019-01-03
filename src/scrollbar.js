
export default class ScrollBar {

    constructor({ele, type, x, y, width, max, onMove}) {
        this.ele = ele;
        this.type = type || 'vertical';
        this.x = x;
        this.y = null;
        this.width = width || '100%';

        this.onMove = onMove;

        this._moving = false;
        this._min = 0;
        this._x;
        this.init();

        return this;
    }


    init() {
        // setup scroll container
        this.ele.style.width = this.width;
        this.ele.style.marginLeft = this.x;

        // add handle
        let handle = document.createElement('div');
        handle.className = 'scroll-handle';
        this.ele.appendChild(handle);

        // events
        handle.addEventListener('mousedown', this.drag.bind(this));
        document.addEventListener('mouseup', this.stop.bind(this));
    }

    drag(evt) {
        let self = this;
        this._moving = true;
        let handle = evt.target;

        this.mousemoveHandle = document.addEventListener('mousemove', function(evt) {
            if (!self._moving) return;

            let xPos = evt.clientX - self.x - (handle.offsetWidth / 2);

            if (xPos > self.max - handle.offsetWidth) return;
            if (xPos < self._min) return;

            self.onMove(xPos);
            handle.setAttribute('style', `left: ${xPos}px;`);
        });
    }

    stop() {
        this._moving = false;
        document.removeEventListener('mousemove', this.mousemoveHandle);
    }

}
