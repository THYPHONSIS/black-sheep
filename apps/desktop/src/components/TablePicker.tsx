import { useRef, useState } from 'react';

export default function TablePicker({onSelect}: {onSelect: (rows: number, columns: number) => void}) {
  const [selection, setSelection] = useState([1, 1]);
  const buttons = useRef<Array<HTMLButtonElement | null>>([]);
  return <div className="table-picker" role="group" aria-label="Tabellenraster">
    <p>{selection[0]} Zeilen × {selection[1]} Spalten</p>
    <div className="table-grid">{Array.from({length: 64}, (_, index) => {
      const row = Math.floor(index / 8) + 1;
      const column = index % 8 + 1;
      return <button key={index} type="button" ref={element => {buttons.current[index] = element;}} aria-label={`${row} Zeilen × ${column} Spalten`} tabIndex={selection[0] === row && selection[1] === column ? 0 : -1} className={row <= selection[0]! && column <= selection[1]! ? 'cell chosen' : 'cell'} onMouseEnter={() => setSelection([row, column])} onFocus={() => setSelection([row, column])} onClick={() => onSelect(row, column)} onKeyDown={event => {
        const delta: Record<string, [number, number]> = {ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1]};
        const step = delta[event.key];
        if (!step) return;
        event.preventDefault();
        const nextRow = Math.max(1, Math.min(8, row + step[0]));
        const nextColumn = Math.max(1, Math.min(8, column + step[1]));
        buttons.current[(nextRow - 1) * 8 + nextColumn - 1]?.focus();
      }} />;
    })}</div>
    <small>Auch mit den Pfeiltasten bedienbar.</small>
  </div>;
}
