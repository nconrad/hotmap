/**
 * options.js
 *
 * Panel for various options.
 *
 * Authors: nconrad
 *
 */
export default class Options {

    constructor({openBtn, onSort}) {
        this.openBtn = openBtn;
        this.onSort = onSort;

        this._viewerNode = this.openBtn.parentNode.parentNode;
        this._show = false;

        this.init();
    }

    init() {
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
                if (document.querySelector('.options').contains(evt.target)) return;
                this.hide();
                document.removeEventListener('click', close);
                this._show = false;
            };
            document.addEventListener('click', close);
        };


        document.querySelector('.close-btn').onclick = () => this.hide();

        // click events for sorting
        this.sortEventInit();
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

                let category = ele.getAttribute('data-id');
                ele.classList.add('active');
                this.onSort(category);
            };
        });
    }
}


