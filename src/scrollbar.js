
export default class ScrollBar {

    constructor({ele, type, x, y, length, onMove}) {
        this.ele = ele;
        this.type = type || 'vertical';
        this.x = x;
        this.y = y;
        this.length = length || '100%';

        this.onMove = onMove;

        this._moving = false;
        this._min = 0;
        this.init();

        return this;
    }


    init() {
        // setup scroll container
        this.setLength(this.length);
        this.setXPosition(this.x);
        this.setYPosition(this.y);

        // add handle
        let handle = document.createElement('div');
        handle.className = 'scroll-handle';
        this.ele.appendChild(handle);

        // events
        if (this.type === 'vertical') {
            handle.addEventListener('mousedown', this.verticalDrag.bind(this));
            document.addEventListener('mouseup', this.verticalStop.bind(this));
        } else { // horizontal
            handle.addEventListener('mousedown', this.horizontalDrag.bind(this));
            document.addEventListener('mouseup', this.horizontalStop.bind(this));
        }
    }

    setXPosition(x) {
        this.x = x;
        this.ele.style.left = x;
    }

    setYPosition(y) {
        this.y = y;
        this.ele.style.top = y;
    }

    setLength(length) {
        this.length = length;
        if (this.type === 'vertical') {
            this.ele.style.height = length;
        } else {
            this.ele.style.width = length;
        }
    }

    horizontalDrag(evt) {
        let self = this;
        this._moving = true;
        let handle = evt.target;
        let containerX = this.ele.parentNode.getBoundingClientRect().x;

        this.horizontalMove = document.addEventListener('mousemove', function(evt) {
            if (!self._moving) return;

            // subtract scroll bar position and use center of handle
            // <mouse position> - <scrollbar position> - <absolute position> - <handleW / 2>
            let mouseX = evt.clientX - self.x - containerX - (handle.offsetWidth / 2);

            // enforce boundaries (improve)
            if (mouseX > self.length - handle.offsetWidth) return;

            if (mouseX < self._min) {
                self.onMove(0);
                handle.setAttribute('style', `left: 0px;`);
                return;
            }

            // subtract handle length/width from scrollbar width
            let percent = mouseX / (self.length - handle.offsetWidth);

            self.onMove(percent);
            handle.setAttribute('style', `left: ${mouseX}px;`);
        });
    }

    horizontalStop() {
        this._moving = false;
        document.removeEventListener('mousemove', this.horizontalMove);
    }

    verticalDrag(evt) {
        let self = this;
        this._moving = true;
        let handle = evt.target;
        let containerY = this.ele.parentNode.getBoundingClientRect().y;

        this.verticalMove = document.addEventListener('mousemove', function(evt) {
            if (!self._moving) return;

            // subtract scroll bar position and use center of handle
            let mouseY = evt.clientY - self.y - containerY - (handle.offsetHeight / 2);

            // enforce boundaries
            if (mouseY > self.length - handle.offsetHeight) return;

            if (mouseY < self._min) {
                self.onMove(0);
                handle.setAttribute('style', `top: 0px;`);
                return;
            }

            // subtract handle length/width from scrollbar width
            let percent = mouseY / (self.length - handle.offsetHeight);

            self.onMove(percent);
            handle.setAttribute('style', `top: ${mouseY}px;`);
        });
    }


    verticalStop() {
        this._moving = false;
        document.removeEventListener('mousemove', this.verticalMove);
    }


}
