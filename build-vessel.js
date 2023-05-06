import { html } from 'htm/preact'
import { useState } from 'preact/hooks'
import { uiState } from './ui-store.js'
import { components } from './components.js'

const styles = new CSSStyleSheet()
styles.replaceSync(`
.build-vessel {
  background: #172d29;
  width: 100%;
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: all;
  display: flex;
  flex-direction: column;
}

.build-vessel button {
  background: none;
  border: none;
  color: #96F9FF;
  font: inherit;
  cursor: pointer;
}
.build-vessel button:hover {
  background: #3E9D98;
  color: #172d29;
}

.build-vessel__title {
  font-size: 1.2em;
  margin: 0;
  padding: 8px;
  color: #96F9FF;
  border-bottom: 3px solid #96F9FF;
  flex: 0;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.build-vessel__content {
  display: flex;
  flex-direction: row;
  flex: 1;
}

.build-vessel__library {
  width: 400px;
}

.build-vessel__modules {
  flex-grow: 1;
  border-left: 3px solid #96F9FF;
  border-right: 3px solid #96F9FF;
}

.build-vessel__summary {
  width: 300px;
}

.build-vessel__library {
  display: flex;
  flex-direction: column;
}

.library-module {
  padding: 8px;
  border-bottom: 1px solid #96F9FF;
}

.library-module__title {
  font-weight: bold;
  margin: 0;
  padding: 0;
  color: #96F9FF;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.library-module__description {
  color: lightgray;
  font-size: 0.8em;
}

.vessel-module {
  padding: 8px;
  border-bottom: 1px solid #96F9FF;
}

.vessel-module__title {
  font-weight: bold;
  margin: 0;
  padding: 0;
  color: #96F9FF;
}

.vessel-module__parameters {
  display: flex;
  flex-direction: column;
}

.vessel-module__parameter {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
}

.vessel-module__parameter-name {
  margin-right: 8px;
}

.vessel-module__parameter-value {
  flex-grow: 1;
}

.vessel-module__parameter-value input {
  width: 100%;
}

input[type=range] {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
  height: 16px;
}

input[type=range]::-webkit-slider-runnable-track {
  height: 1px;
  background: white;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 15px;
  height: 15px;
  margin-top: -7px;
  background-color: #96F9FF;
  border-radius: 50%;
  border: 2px solid #172d29;
}
`)
document.adoptedStyleSheets = [...document.adoptedStyleSheets, styles]

function LibraryModule({module, onAddModule}) {
  return html`
    <div class="library-module">
      <div class="library-module__title">
        ${module.name}
        <button onclick=${onAddModule}>+</button>
      </div>
      <div class="library-module__description">${module.description}</div>
    </div>
  `
}

function VesselModule({module}) {
  return html`
    <div class="vessel-module">
      <div class="vessel-module__title">
        ${module.name}
      </div>
      <div class="vessel-module__parameters">
        ${module.parameters.map(param => html`
          <div class="vessel-module__parameter">
            <div class="vessel-module__parameter-name">${param.name}</div>
            <div class="vessel-module__parameter-value">
              <input type="range" min=${param.min} max=${param.max} value=${param.default} />
            </div>
          </div>
        `)}
      </div>
    </div>
  `
}

export function BuildVessel() {
  const [modules, setModules] = useState([])
  return html`
    <div class="build-vessel">
      <div class="build-vessel__title">
        VESSEL PLAN
        <button onClick=${() => uiState.overlay.value = null}>X</button>
      </div>
      <div class="build-vessel__content">
        <div class="build-vessel__library">
          ${components.map(module => html`<${LibraryModule} module=${module} onAddModule=${() => setModules((m) => [...m, Object.create(module)])} />`)}
        </div>
        <div class="build-vessel__modules">
          ${modules.map(module => html`<${VesselModule} module=${module} />`)}
        </div>
        <div class="build-vessel__summary">
        </div>
      </div>
    </div>
  `
}
