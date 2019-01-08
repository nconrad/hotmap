
export default class ScrollBar {

    constructor({ele, type, x, y, width, max, onMove}) {
        this.ele = ele;
        this.type = type || 'vertical';
        this.max = max; // largest possible value
        this.x = x;
        this.y = y;
        this.width = width || '100%';

        this.onMove = onMove;

        this._moving = false;
        this._min = 0;
        this.init();

        return this;
    }


    init() {
        // setup scroll container
        this.setWidth(this.width);
        this.setXPosition(this.x);
        this.setYPosition(this.y);

        // add handle
        let handle = document.createElement('div');
        handle.className = 'scroll-handle';
        this.ele.appendChild(handle);

        // events
        handle.addEventListener('mousedown', this.drag.bind(this));
        document.addEventListener('mouseup', this.stop.bind(this));
    }

    setXPosition(x) {
        this.x = x;
        this.ele.style.left = x;
    }

    setYPosition(y) {
        this.y = y;
        this.ele.style.top = y;
    }

    setWidth(width) {
        this.width = width;
        this.ele.style.width = width;
    }

    drag(evt) {
        let self = this;
        this._moving = true;
        let handle = evt.target;

        this.mousemoveHandle = document.addEventListener('mousemove', function(evt) {
            if (!self._moving) return;

            // subtract scroll bar position and use center of handle
            let mouseX = evt.clientX - self.x - (handle.offsetWidth / 2);

            // enforce boundaries
            if (mouseX > self.width - handle.offsetWidth) return;
            if (mouseX < self._min) return;

            // subtract handle width from scrollbar width
            let percent = mouseX / (self.width - handle.offsetWidth);

            self.onMove(percent);
            handle.setAttribute('style', `left: ${mouseX}px;`);
        });
    }

    stop() {
        this._moving = false;
        document.removeEventListener('mousemove', this.mousemoveHandle);
    }

}
