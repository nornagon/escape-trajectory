import { html } from 'htm/preact'
import { useRef } from 'preact/hooks'
const styles = new CSSStyleSheet()
styles.replaceSync(`
.number-input {
  display: inline-flex;
  flex-direction: row;
}

.number-input input[type=number] {
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  outline: none;
  width: 6em;
  text-align: center;
}

.number-input input[type=number]::-webkit-inner-spin-button,
input[type=number]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  appearance: none;
}
`)
document.adoptedStyleSheets = [...document.adoptedStyleSheets, styles]

export function NumberInput(props) {
  const input = useRef()
  const stepUp = () => {
    input.current?.stepUp()
    input.current?.dispatchEvent(new Event("input", {bubbles: true}))
  }
  const stepDown = () => {
    input.current?.stepDown()
    input.current?.dispatchEvent(new Event("input", {bubbles: true}))
  }
  return html`
    <div class="number-input">
      <button class="dec" onclick=${stepDown}>−</button>
      <input type="number" ref=${input} ...${props} />
      <button class="inc" onclick=${stepUp}>+</button>
    </div>
  `
}
