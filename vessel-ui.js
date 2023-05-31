import { html } from 'htm/preact'
import { universe } from './universe-state.js'
import { parameterDisplay } from './modules.js'

const styles = new CSSStyleSheet()
styles.replaceSync(`
.vessel-details {
  background: #172d29;
  width: 300px;
  padding: 8px;
  height: 100%;
  position: absolute;
  right: 0;
  border-left: 3px solid #96F9FF;
  pointer-events: all;
}

.vessel-details__title {
  font-size: 1.2em;
  margin: 0;
  padding: 0;
  color: #96F9FF;
}

.vessel-details__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.vessel-details__label {
  color: #3bffbd;
  text-transform: uppercase;
}

.vessel-details__value {
  color: lightgray;
}
`)
document.adoptedStyleSheets = [...document.adoptedStyleSheets, styles]

export function VesselDetails({vesselId}) {
  const vessel = universe.vessels[vesselId]
  return html`
    <div class="vessel-details">
      <div class="vessel-details__title">${vessel.name}</div>
      <div class="vessel-details__content">
        <div class="vessel-details__row">
          <div class="vessel-details__label">Mass</div>
          <div class="vessel-details__value">${parameterDisplay.mass.format(vessel.mass)}</div>
        </div>
        <div class="vessel-details__row">
          <div class="vessel-details__label">∆v</div>
          <div class="vessel-details__value">${parameterDisplay.deltaV.format(vessel.configuration.deltaV)}</div>
        </div>
      </div>
      <div class="vessel-details__modules">
        ${vessel.configuration.modules.map(m => html`
          <div class="vessel-details__module">
            <div class="vessel-details__module-name">${m.name}</div>
          </div>
        `)}
      </div>
    </div>
  `
}
