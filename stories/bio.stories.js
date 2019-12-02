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
      rowMetaLabels: rowMetaLabels,
      colMetaLabels: ['Protein Family ID'],
      options: {
          rowLabelEllipsisPos: 1
      },
      color: {
          bins: ['=0', '=1', '=2', '=3', '>=4'],
          colors: ['#ffffff', '#fbe6e2', 0xffadad, 0xff6b6b, 0xff0000]
      },
      onHover: info => {
          const cs = info.rowMeta;
          return `<div><b>Genome:</b> ${info.yLabel}</div><br>
            <div><b>Protein Family:</b> ${info.xLabel}<div>
            <div><b>ID:</b> ${info.colMeta[0]}<div><br>
            <div><b>${rowMetaLabels[0]}:</b> ${cs && cs[0] != 'undefined' ? cs[0] : 'N/A'}</div>
            <div><b>${rowMetaLabels[1]}:</b> ${cs && cs[1] != 'undefined' ? cs[1] : 'N/A'}</div>
            <div><b>${rowMetaLabels[2]}:</b> ${cs && cs[2] != 'undefined' ? cs[2] : 'N/A'}</div><br>
            <div><b>Value:</b> ${info.value}</div>`;
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
