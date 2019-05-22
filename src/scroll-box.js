/**
 * scroll-box.js
 *
 * A scrollbar implementation for heatmap.js, using fake content area.
 *
 * Authors: nconrad
 *
 */

let barOffset = '15';

export default class ScrollBox {

    constructor({
        ele, x, y, width, height, xMax, yMax,
        contentWidth, contentHeight, onMove, onMouseWheel
    }) {
        this.ele = ele;
        this.x = x;
        this.y = y;

        this.setMaxes(xMax, yMax);

        // events
        this._onMove = onMove;
        this._onMouseWheel = onMouseWheel;

        // initial scrollbox dimensions
        this.width = width;
        this.height = height;
        this.contentWidth = contentWidth;
        this.contentHeight = contentHeight;

        this.init();

        return this;
    }

    init() {
        // setup scroll container
        let container = this.ele.querySelector('.scroll-container');

        // for firefox, at least show on hover
        if (navigator.userAgent.search('Firefox') != -1) {
            container.classList.add('ff');
        }

        container.style.position = 'absolute';
        container.style.top = `${this.y}px`;
        container.style.left = `${this.x}px`;
        container.style.width = `${this.width}px`;
        container.style.height = `${this.height}px`;
        this.scrollContainer = container;

        // setup fake content
        let content = document.createElement('div');
        content.classList.add('scroll-content');
        content.style.top = `${this.y}px`;
        content.style.left = `${this.x}px`;
        content.style.width = `${this.contentWidth - barOffset}px`;
        content.style.height = `${this.contentHeight - barOffset}px`;

        this.scrollContainer.appendChild(content);
        this.content = content;

        // scroll event
        let previousX = 0,
            previousY = 0;
        this.scrollContainer.addEventListener('scroll', evt => {
            let target = evt.target;

            let y = target.scrollTop,
                x = target.scrollLeft;

            let xDirection = x > previousX ? 'right' : (x === previousX ? null : 'left'),
                yDirection = y > previousY ? 'down' : (y === previousY ? null : 'up');

            if (xDirection) {
                let percent = target.scrollLeft / target.scrollWidth;
                let pos = Math.ceil(percent * this.xMax);
                this._onMove('x', pos);
            }

            if (yDirection) {
                let percent = target.scrollTop / target.scrollHeight;
                let pos = Math.ceil(percent * this.yMax);
                this._onMove('y', pos);
            }

            previousX = x;
            previousY = y;
        });

        // zoom event
        this.scrollContainer.addEventListener('mousewheel', (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
                this._onMouseWheel({deltaY: e.deltaY});
            }
        });
    }

    setContentWidth(width) {
        this.contentWidth = width - barOffset;
        this.content.style.width = `${this.contentWidth}px`;
    }

    setContentHeight(height) {
        this.contentHeight = height - barOffset;
        this.content.style.height = `${this.contentHeight}px`;
    }

    setContainerWidth(width) {
        this.width = width;
        this.scrollContainer.style.width = `${width}px`;
    }

    setContainerHeight(height) {
        this.height = height;
        this.scrollContainer.style.height = `${height}px`;
    }

    hideY() {
        this.scrollContainer.style.paddingRight = 0;
    }

    showY() {
        this.scrollContainer.style.paddingRight = `${barOffset}px`;
    }

    hideX() {
        this.scrollContainer.style.paddingBottom = 0;
    }

    showX() {
        this.scrollContainer.style.paddingBottom = `${barOffset}px`;
    }

    setMaxes(x, y) {
        this.xMax = x;
        if (y) this.yMax = y;
    }

    setPos(x, y) {
        this.x = x;
        if (y) this.y = y;
    }
}
