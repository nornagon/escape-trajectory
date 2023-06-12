import { html } from 'htm/preact'
import { universe } from '../universe-state.js'
import { parameterDisplay } from '../modules.js'
import { formatDuration } from '../util.js'
import { uiState } from './store.js'

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

.vessel-details__maneuvers {
  margin-top: 8px;
  border-top: 1px solid #3bffbd;
  padding-top: 8px;
}

.vessel-details__maneuvers-title {
  color: #3bffbd;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.vessel-details__maneuver {
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #3bffbd;
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
          <div class="vessel-details__value">${parameterDisplay.mass.format(uiState.trajectoryHoverTime != null ? vessel.massAt(uiState.trajectoryHoverTime) : vessel.mass)}</div>
        </div>
        <div class="vessel-details__row">
          <div class="vessel-details__label">∆v</div>
          <div class="vessel-details__value">${parameterDisplay.deltaV.format(uiState.trajectoryHoverTime != null ? vessel.deltaVAt(uiState.trajectoryHoverTime) : vessel.deltaV)}</div>
        </div>
      </div>
      <div class="vessel-details__modules">
        ${vessel.configuration.modules.map(m => html`
          <div class="vessel-details__module">
            <div class="vessel-details__module-name">${m.name}</div>
          </div>
        `)}
      </div>
      <div class="vessel-details__resources">
        ${Object.entries(uiState.trajectoryHoverTime != null ? vessel.resourcesAt(uiState.trajectoryHoverTime) : vessel.configuration.resources).map(([name, amount]) => html`
          <div class="vessel-details__resource">
            <div class="vessel-details__resource-name">${name}</div>
            <div class="vessel-details__resource-amount">${amount}</div>
          </div>
        `)}
      </div>
      <div class="vessel-details__maneuvers">
        <div class="vessel-details__maneuvers-title">Maneuvers</div>
        ${vessel.maneuvers.map(m => html`
          <div class="vessel-details__maneuver">
            <div class="vessel-details__maneuver-time">T–${formatDuration(m.startTime - universe.currentTime)}</div>
            <div class="vessel-details__maneuver-duration">∆t ${formatDuration(m.duration)}</div>
            <div class="vessel-details__maneuver-delta-v">∆v ${parameterDisplay.deltaV.format(m.deltaV)}</div>
            <div class="vessel-details__maneuver-delta-m">∆m ${parameterDisplay.mass.format(m.massUsed)}</div>
            <label class="vessel-details__maneuver-inertially-fixed">
              <input type="checkbox" class="vessel-details__maneuver-toggle" checked=${m.inertiallyFixed} oninput=${(e) => {
                m.inertiallyFixed = e.target.checked
                m.vessel.trajectory.forgetAfter(m.startTime)
                universe.recompute()
              }} />
              Inertially fixed
            </div>
          </div>
        `)}
      </div>
    </div>
  `
}
