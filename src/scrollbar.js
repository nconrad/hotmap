

export default class ScrollBar {

    constructor({ele, type, min, max, onMove}) {
        this.ele = ele;
        this.type = type || 'vertical';
        this.min = min || 0;
        this.max = max || 500;
        this.onMove = onMove;

        this._moving = false;
        this._x;
        this.init();
    }


    init() {
        // setup scroll container
        this.ele.style.width = `${this.max}px`;

        // add handle
        let handle = document.createElement('div');
        handle.className = 'scroll-handle';
        this.ele.appendChild(handle);

        // events
        handle.addEventListener('mousedown', this.drag.bind(this));
        handle.addEventListener('mouseup', this.stop.bind(this));
    }

    drag(evt) {
        let self = this;
        this._moving = true;
        let handle = evt.target;
        let width = handle.offsetWidth / 2; // move via center of handle

        document.addEventListener('mousemove', function(evt) {
            if (!self._moving) return;

            let x = evt.clientX - width;

            if (x > self.max - handle.offsetWidth) return;
            if (x < self.min) return;

            self.onMove(x);
            handle.setAttribute('style', `left: ${x}px;`);
        });

    }

    stop() {
        this._moving = false;
    }

}
