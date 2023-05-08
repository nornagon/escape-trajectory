import { html } from 'htm/preact'
import { useState } from 'preact/hooks'
import { useSignal } from '@preact/signals'
import { uiState } from './ui-store.js'
import { moduleTypes, parameterDisplay } from './modules.js'
import { VesselConfiguration } from './vessel.js'

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
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.vessel-module__parameters {
  display: table;
}

.vessel-module__parameter {
  display: table-row;
}

.vessel-module__parameter-name {
  padding-right: 8px;
  display: table-cell;
  font-weight: bold;
}

.vessel-module__parameter-value {
  display: table-cell;
}

.vessel-module__parameter-value input {
  width: 300px;
  margin-right: 8px;
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
  border: 3px solid #172d29;
}

.build-vessel__summary {
  padding: 8px;
  display: flex;
  flex-direction: column;
}

.build-vessel__summary__title {
  font-weight: bold;
  margin: 0;
  padding: 0;
  color: #96F9FF;
}

.build-vessel__summary__content {
  margin-top: 8px;
  flex: 1;
}

.build-vessel__summary__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.build-vessel__summary__label {
  font-weight: bold;
}

.build-vessel__summary__action {
  padding: 2px;
  border: 1px solid #96F9FF;
}

.build-vessel__summary__action button {
  width: 100%;
  line-height: 2em;
  background: #96F9FF;
  border: none;
  color: #172d29;
  font-family: inherit;
  text-transform: uppercase;
  letter-spacing: 1em;
  padding-left: calc(1em + 6px);
  cursor: pointer;
}

.build-vessel__summary__action button:hover {
  background: #3E9D98;
  color: #172d29;
}

.build-vessel__summary__action button:disabled {
  background: gray;
  color: #172d29;
  cursor: not-allowed;
}
`)
document.adoptedStyleSheets = [...document.adoptedStyleSheets, styles]

function splice(arr, ...args) {
  const a = [...arr]
  a.splice(...args)
  return a
}

function LibraryModuleType({moduleType, onAdd}) {
  return html`
    <div class="library-module">
      <div class="library-module__title">
        ${moduleType.name}
        <button onclick=${onAdd}>+</button>
      </div>
      <div class="library-module__description">${moduleType.description}</div>
    </div>
  `
}

function VesselModule({module, onUpdate, onRemove}) {
  return html`
    <div class="vessel-module">
      <div class="vessel-module__title">
        ${module.name}
        <button onclick=${onRemove}>–</button>
      </div>
      <div class="vessel-module__parameters">
        ${Object.entries(module.constructor.parameters).map(([key, param]) => {
          const display = parameterDisplay[key]
          if (param.min && param.max) {
            return html`
              <div class="vessel-module__parameter">
                <div class="vessel-module__parameter-name">${display.name}</div>
                <div class="vessel-module__parameter-value">
                  <input type="range" min=${param.min} max=${param.max} value=${module[key]} oninput=${(e) => {
                    if (e.target.value === module[key]) return
                    module[key] = Number(e.target.value)
                    onUpdate()
                  }} />
                  ${display.format(module[key])}
                </div>
              </div>
            `
          } else {
            return html`
              <div class="vessel-module__parameter">
                <div class="vessel-module__parameter-name">${display.name}</div>
                <div class="vessel-module__parameter-value">
                  ${display.format(module[key])}
                </div>
              </div>
            `
          }
        })}
      </div>
    </div>
  `
}

export function BuildVessel({facility, site}) {
  const [modules, setModules] = useState([])
  const fuel = useSignal(0)
  const totalMass = modules.reduce((sum, m) => sum + m.mass, 0) + fuel.value
  const totalCost = modules.reduce((sum, m) => sum + m.cost, 0) + fuel.value * 100
  return html`
    <div class="build-vessel">
      <div class="build-vessel__title">
        VESSEL PLAN
        <button onClick=${() => uiState.overlay.value = null}>×</button>
      </div>
      <div class="build-vessel__content">
        <div class="build-vessel__library">
          ${moduleTypes.map(moduleType => html`
            <${LibraryModuleType}
              moduleType=${moduleType}
              onAdd=${() => setModules((m) => [...m, new moduleType])} />`)}
        </div>
        <div class="build-vessel__modules">
          ${modules.map((module, i) => html`
            <${VesselModule}
              module=${module}
              onUpdate=${() => setModules(m => [...m] /* force update ... hm :/ */)}
              onRemove=${() => setModules((m) => splice(m, i, 1))} />`)}
        </div>
        <div class="build-vessel__summary">
          <div class="build-vessel__summary__title">TOTAL</div>
          <div class="build-vessel__summary__content">
            <div class="build-vessel__summary__row">
              <div class="build-vessel__summary__label">Fuel</div>
              <div class="build-vessel__summary__value">
                <input type="number" min="0" max="100" value=${fuel} oninput=${e => fuel.value = Number(e.target.value)} /> kg
              </div>
            </div>
            <div class="build-vessel__summary__row">
              <div class="build-vessel__summary__label">Mass</div>
              <div class="build-vessel__summary__value">${parameterDisplay.mass.format(totalMass)}</div>
            </div>
            <div class="build-vessel__summary__row">
              <div class="build-vessel__summary__label">Cost</div>
              <div class="build-vessel__summary__value">${parameterDisplay.cost.format(totalCost)}</div>
            </div>
          </div>
          <div class="build-vessel__summary__action">
            <button disabled=${modules.length === 0} onclick=${() => {
              site.vessels.push(new VesselConfiguration({
                name: "Untitled",
                color: "lime",
                modules,
                resources: { volatiles: fuel.value },
              }))

              uiState.overlay.value = null
            }}>BUILD</button>
          </div>
        </div>
      </div>
    </div>
  `
}
