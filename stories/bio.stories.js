import Hotmap from '../src/hotmap'
import { start } from './start-demo'

import data from '../demo/data/med.json'

export default {title: 'Bio Examples'}

export const proteinFamilies = () => {
  start(() => {
    const {rows, cols, matrix} = data;

    const rowMetaLabels = ['Isolation Country', 'Host', 'Genome Group'];

    new Hotmap({
      ele: document.getElementById('chart'),
      rows,
      cols,
      matrix,
      rowsLabel: 'Genomes',
      colsLabel: 'Protein Families',
      rowMetaLabels,
      colMetaLabels: ['Protein Family ID'],
      options: {
          rowLabelEllipsisPos: 1
      },
      onHover: info => {
          const meta = info.rowMeta;
          return `
            <div><b>Genome:</b> ${info.yLabel}</div><br>
            <div><b>Protein Family:</b> ${info.xLabel}<div>
            <div><b>ID:</b> ${info.colMeta[0]}<div><br>
            ${
              rowMetaLabels.map(
               (label, i) => `<div><b>${label}:</b> ${meta && meta[i] != 'undefined' ? meta[i] : 'N/A'}</div>`
              ).join('')
            }
            <br>
            <div><b>Value:</b> ${info.value}</div>
          `
      },
      onSelection: selection => {
          alert(`Selected ${selection.length} cell(s)\n\n` +
              JSON.stringify(selection, null, 4).slice(0, 10000));
      },
      onClick: selection => {
          alert(JSON.stringify(selection, null, 4));
      }
    })
  })

  return '';
}
