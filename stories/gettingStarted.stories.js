import Hotmap from '../src/hotmap';
import { start } from './start-demo';
import { getMockLabels } from './mock-data';

export default {title: 'Getting Started'}


export const basicConfig = () => {
  const demo = () => {
    new Hotmap({
      ele: document.getElementById('chart'),
      matrix: [[1, 2, 3, 4], [0.8, 6, 4, 5], [2, 10, 1.5, 1.4], [1.9, 3, 4, 5]]
    })
  }

  return start(demo)
}


export const colorConfig = () => {
  const demo = () => {
    new Hotmap({
      ele: document.getElementById('chart'),
      matrix: [[1, 2, 3, 4], [0.8, 6, 4, 5], [2, 10, 1.5, 1.4], [1.9, 3, 4, 5]],
      color: {
        bins: ['<=1', '<=2', '<=3', '<=4', '>4'],
        colors: [0x330000, 0x660000, 0x990000, 0xcc0000, 0xFF0000]
      }
    });
  };

  return start(demo)
}


export const events = () => {

  const matrix = [[1, 2, 3, 4], [0.8, 6, 4, 5], [2, 10, 1.5, 1.4], [1.9, 3, 4, 5]]

  const demo = () => {
    const {rows, cols} = getMockLabels(4, 4)

    new Hotmap({
      ele: document.getElementById('chart'),
      rows,
      cols,
      matrix,
      onSelection: (selection, rowIDs, colIDs) => {
        console.log('colIDs:', colIDs)
        console.log('rowIDs:', rowIDs)

        alert(
          `Selected ${selection.length} cell(s)\n\n` +
          JSON.stringify(selection, null, 4)
        );
      },
      onClick: selection => {
        alert(JSON.stringify(selection, null, 4));
      },
      onHover: info => {
        return `Hovered on: ${JSON.stringify(info)}`;
      },
    })
  }

  return start(demo)
}

