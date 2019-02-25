/**
 * scrollbar.js
 *
 * A scrollbar implementation for heatmap.js, using fake content area.
 *
 * Authors: nconrad
 */

let barOffset = '15';

export default class ScrollBar {

    constructor({
        ele, x, y, width, height, xMax, yMax,
        contentWidth, contentHeight, onMove,
    }) {
        this.ele = ele;
        this.x = x;
        this.y = y;

        this._xMax = xMax;
        this._yMax = yMax;

        // events
        this._onMove = onMove;

        this.width = width;
        this.height = height;
        this.contentWidth = contentWidth;
        this.contentHeight = contentHeight;

        this.init();

        return this;
    }

    init() {
        // setup scroll container
        let container = document.querySelector('.scroll-container');
        container.style.position = 'absolute';
        container.style.overflowY = 'scroll';
        container.style.padding = `0 ${barOffset}px ${barOffset}px 0`;
        this.scrollContainer = container;

        container.style.top = this.y;
        container.style.left = this.x;
        container.style.width = this.width - barOffset;
        container.style.height = this.height - barOffset;

        // setup fake content
        let content = document.createElement('div');
        content.style.top = this.y;
        content.style.left = this.x;
        content.style.width = this.contentWidth;
        content.style.height = this.contentHeight;

        this.scrollContainer.append(content);
        this.content = content;

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
                let pos = Math.ceil(percent * this._xMax);
                this._onMove('x', pos);
            }

            if (yDirection) {
                let percent = target.scrollTop / target.scrollHeight;
                let pos = Math.ceil(percent * this._yMax);
                this._onMove('y', pos);
            }

            previousX = x;
            previousY = y;
        });
    }

    setWidth(width) {
        this.content.style.width = width - barOffset;
    }

    setHeight(height) {
        this.content.style.height = height - barOffset;
    }

    setContentWidth(width) {
        this.scrollContainer.style.width = width;
    }

    setContentHeight(height) {
        this.scrollContainer.style.height = height;
    }

}
