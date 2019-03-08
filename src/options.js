/**
 * options.js
 *
 * Panel for various options.
 *
 * Authors: nconrad
 *
 */
export default class Options {

    constructor({openBtn, onSortChange, color, onColorChange}) {
        this.openBtn = openBtn;
        this.onSortChange = onSortChange;
        this.onColorChange = onColorChange;

        this._color = color;
        this._viewerNode = this.openBtn.parentNode.parentNode;
        this._show = false;

        this.init();
    }

    init() {
        let ele = this._viewerNode;

        let optsBtn = this.openBtn;
        optsBtn.onclick = (evt) => {
            this._show = !this._show;
            if (this._show) {
                this.show(evt);
            } else {
                this.hide();
                return;
            }

            let close = (evt) => {
                if (ele.querySelector('.options').contains(evt.target)) return;
                this.hide();
                ele.removeEventListener('click', close);
                this._show = false;
            };
            ele.addEventListener('click', close);
        };

        ele.querySelector('.close-btn').onclick = () => this.hide();


        if (this._color !== 'gradient') {
            let el = ele.querySelector('.colors');
            el.style.display = 'block'
            el.onclick = () => this._onColor;
            ele.querySelector('.colors [data-id="bins"]');
        }

        this.colorEventInit();

        // click events for sorting
        // this.sortEventInit();
    }

    show(evt) {
        evt.stopPropagation();
        this._viewerNode.querySelector('.options').style.visibility = 'visible';
        this._viewerNode.querySelector('.options').style.height = `${200 - 4}px`;
    }

    hide() {
        this._viewerNode.querySelector('.options').style.height = '0';
        setTimeout(() => {
            this._viewerNode.querySelector('.options').style.visibility = 'hidden';
        });
    }

    sortEventInit() {
        let sortNodes = this._viewerNode.querySelectorAll('.options .sorting a');
        sortNodes.forEach(node => {
            node.onclick = evt => {
                let ele = evt.target;

                sortNodes.forEach(node => node.classList.remove('active'));

                let type = ele.getAttribute('data-id');
                ele.classList.add('active');
                this.onSort(type);
            };
        });
    }

    colorEventInit() {
        let nodes = this._viewerNode.querySelectorAll('.options .colors a');
        nodes.forEach(node => {
            node.onclick = evt => {
                let ele = evt.target;

                nodes.forEach(node => node.classList.remove('active'));

                let type = ele.getAttribute('data-id');
                ele.classList.add('active');
                this.onColorChange(type);
            };
        });
    }
}


