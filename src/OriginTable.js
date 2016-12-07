/**
 * Created by lijun on 2016/11/16.
 */
import $ from 'jquery';
import './main.css';
import { empty, appendSibling, insertBeforeSibling, handleTr } from './util';
import SortTableList from './SortTableList';

const checkIsTable = ele =>
typeof ele === 'object' && 'nodeType' in ele &&
ele.nodeType === 1 && ele.cloneNode && ele.nodeName === 'TABLE';

class Table {
  constructor (table = null) {
    if (!checkIsTable(table)) {
      throw new Error(`TableSortable: el must be TABLE HTMLElement, not ${{}.toString.call(table)}`);
    }

    this.el = table;
    this.visibility = table.style.visibility;
    this.movingRow = Array.from(this.el.children).find(el =>
      ((el.nodeName !== 'COL') && (el.nodeName !== 'COLGROUP'))).children[0];
    // console.log(Array.from(this.el.children)[0].nodeName);
    this.colGroup = document.querySelector('colgroup');
    this.movingRow.style.cursor = 'move';
  }
}

export default class SortableTable extends Table {
  constructor (table = null, userOptions) {
    super(table);

    const defaults = {
      mode: 'column',
      excludeFooter: false,
      animation: 150,
    };
    this.options = Object.assign({}, defaults, userOptions);

    for (const fn of Object.getOwnPropertyNames((Object.getPrototypeOf(this)))) {
      if (fn.charAt(0) === '_' && typeof this[fn] === 'function') {
        this[fn] = this[fn].bind(this);
      }
    }

    const footer = table.querySelector('tfoot');
    if (this.options.excludeFooter && footer) {
      footer.classList.add('sindu_exclude');
    }

    this.el.classList.add('sindu_origin_table');
    this.sortTable = this.buildSortable({ mode: this.options.mode });
    $(this.el).on('mousedown', (e) => {
      /* eslint-disable */
      e.target = document.createElement('div');
    });
  }

  static create (el, options) {
    return new SortableTable(el, options);
  }

  static version = '1.0';

  getRows () {
    const rows = [];
    handleTr(this.el, ({ tr }) => {
      rows.push(tr);
    });
    return rows;
  }

  getLength () { // 获得横向长度
    return this.movingRow.children.length;
  }

  getColumnAsTable (index) {
    const table = this.el.cloneNode(true);

    // table.style.borderCollapse = 'collapse';

    const footer = table.querySelector('tfoot');
    if (this.options.excludeFooter && footer) {
      table.removeChild(footer);
    }

    const colGroup = table.querySelector('colgroup');
    // const cols = table.querySelectorAll('col') || (colgroup && colgroup.children);
    if (colGroup) {
      const targetCol = colGroup.children[index];
      targetCol.style.width = '';
      colGroup.innerHTML = '';
      colGroup.appendChild(targetCol);
    }

    table.removeAttribute('id');
    table.classList.remove('sindu_origin_table');
    handleTr(table, ({ tr }) => {
      const target = tr.children[index];
      empty(tr);
      tr.appendChild(target);
    });
    const result = new Table(table);
    result.movingRow.classList.add('sindu_draggable');
    return result;
  }

  sortRow ({ from, to }) {
    if (from === to) {
      return;
    }
    const target = this.getRows()[from]; // 移动的元素
    const origin = this.getRows()[to]; // 被动交换的元素
    if (from < to) {
      appendSibling({ target, origin });
    } else {
      insertBeforeSibling({ target, origin });
    }
  }

  sortColumn ({ from, to }) {
    handleTr(this.el, ({ tr }) => {
      if (tr.parentNode.nodeName === 'TFOOT' && this.options.excludeFooter) {
        return;
      }

      const { children } = tr;
      const target = children[from]; // 移动的元素
      const origin = children[to]; // 被动交换的元素
      if (from < to) {
        appendSibling({ target, origin });
      } else {
        insertBeforeSibling({ target, origin });
      }
    });
    if (this.colGroup) {
      const cols = this.colGroup.children;
      const target = cols[from]; // 移动的元素
      const origin = cols[to]; // 被动交换的元素
      if (from < to) {
        appendSibling({ target, origin });
      } else {
        insertBeforeSibling({ target, origin });
      }
    }
  }

  buildSortable ({ mode }) {
    const { movingRow } = this;
    let tables = [];

    if (mode === 'row') {
      handleTr(this.el, ({ tr }) => {
        const table = this.el.cloneNode(true);
        table.removeAttribute('id');
        table.classList.remove('sindu_origin_table');
        table.innerHTML = '';
        if (this.colGroup) {
          table.appendChild(this.colGroup.cloneNode(true));
        }

        const organ = tr.parentNode.cloneNode();
        organ.innerHTML = '';
        organ.appendChild(tr.cloneNode(true));
        table.appendChild(organ);

        tables.push(new Table(table));
      });
    } else if (mode === 'column') {
      tables = Array.from(movingRow.children).map((td, index) =>
        this.getColumnAsTable(index));
    }

    return new SortTableList({ tables, originTable: this });
  }

  onSortTableDrop ({ from: oldIndex, to: newIndex }) {
    if (this.options.mode === 'row') {
      this.sortRow({ from: oldIndex, to: newIndex });
    } else {
      this.sortColumn({ from: oldIndex, to: newIndex });
    }
  }
}
