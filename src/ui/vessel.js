import { html } from 'htm/preact'
import { universe } from '../universe-state.js'
import { parameterDisplay } from '../modules.js'
import { formatDuration } from '../util.js'
import { transientUiState, uiState } from './store.js'
import { Resources } from './resources.js'
import { Maneuver } from '../vessel.js'

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

.vessel-details__modules {
  border-top: 1px solid #3bffbd;
  padding-top: 8px;
  margin-top: 8px;
}

.vessel-details__modules-title {
  color: #3bffbd;
  text-transform: uppercase;
  margin-bottom: 8px;
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
  const hoverTime = transientUiState.trajectoryHoverTime
  return html`
    <div class="vessel-details">
      <div class="vessel-details__title">${vessel.name}</div>
      <div class="vessel-details__content">
        <div class="vessel-details__row">
          <div class="vessel-details__label">Mass</div>
          <div class="vessel-details__value">${parameterDisplay.mass.format(vessel.massAt(hoverTime ?? universe.currentTime))}</div>
        </div>
        <div class="vessel-details__row">
          <div class="vessel-details__label">∆v</div>
          <div class="vessel-details__value">${parameterDisplay.deltaV.format(vessel.deltaVAt(hoverTime ?? universe.currentTime))}</div>
        </div>
      </div>
      <${Resources} resources=${vessel.resourcesAt(hoverTime ?? universe.currentTime)} />
      <div class="vessel-details__modules">
        <div class="vessel-details__modules-title">Modules</div>
        ${vessel.configuration.modules.map(m => html`
          <div class="vessel-details__module">
            <div class="vessel-details__module-name">${m.name}</div>
          </div>
        `)}
      </div>
      <div class="vessel-details__maneuvers">
        <div class="vessel-details__maneuvers-title">Maneuvers</div>
        ${vessel.maneuvers.filter(m => m.endTime >= universe.currentTime).map(m => html`
          <div class="vessel-details__maneuver">
            <div class="vessel-details__maneuver-time">${m.startTime > universe.currentTime ? `T–${formatDuration(m.startTime - universe.currentTime)}` : `T+${formatDuration(universe.currentTime - m.startTime)}`}</div>
            <div class="vessel-details__maneuver-duration">∆t ${formatDuration(m.remainingDurationAt(universe.currentTime))}</div>
            <div class="vessel-details__maneuver-delta-v">∆v ${parameterDisplay.deltaV.format(m.remainingDeltaVAt(universe.currentTime))}</div>
            <div class="vessel-details__maneuver-delta-m">∆m ${parameterDisplay.mass.format(m.remainingMassAt(universe.currentTime))}</div>
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
