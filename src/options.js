
export default class Options {

    constructor({openBtn}) {
        this.openBtn = openBtn;

        this._show = false;

        this.init();
    }

    init() {
        let optsBtn = this.openBtn;
        optsBtn.onclick = () => {
            this._show = !this._show;

            if (this._show) {
                this.show();
                return;
            }

            this.hide();
        };
    }

    show() {
        let viewerNode = this.openBtn.parentNode.parentNode;
        viewerNode.querySelector('.options').style.visibility = 'visible';
        viewerNode.querySelector('.options').style.height = `${200 - 4}px`;
    }


    hide() {
        let viewerNode = this.openBtn.parentNode.parentNode;
        viewerNode.querySelector('.options').style.height = '0';
        setTimeout(() => {
            viewerNode.querySelector('.options').style.visibility = 'hidden';
        });
    }
}
