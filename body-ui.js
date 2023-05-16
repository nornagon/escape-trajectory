import { html } from 'htm/preact'
import { uiState } from './ui-store.js'
import { universe, useUniverse } from './universe-state.js'
import { Vessel } from './vessel.js'
import { initialOrbitState } from './ephemeris.js'
import { parameterDisplay } from './modules.js'

const styles = new CSSStyleSheet()
styles.replaceSync(`
.body-details {
  background: #172d29;
  width: 300px;
  padding: 8px;
  height: 100%;
  position: absolute;
  right: 0;
  border-left: 3px solid #96F9FF;
  pointer-events: all;
}

.body-details__title {
  font-size: 1.2em;
  margin: 0;
  padding: 0;
  color: #96F9FF;
}

.body-details__content {
  margin-top: 8px;
}

.body-details__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.body-details__label {
  color: #3bffbd;
  text-transform: uppercase;
}

.body-details__value {
  color: lightgray;
}

.body-details__site:before {
  content: "SITE";
  font-size: 0.8em;
  color: #96F9FF;
}

.body-details__site-vessels:before {
  content: "VESSELS";
  font-size: 0.8em;
  color: #96F9FF;
}

.body-details__site-resources {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.body-details__facility {
  margin-left: 8px;
  margin-top: 8px;
  border-left: 3px solid #96F9FF;
  padding-left: 8px;
}

.body-details__facility-type {
  text-transform: uppercase;
}

.body-details__site-vessels {
  margin-left: 8px;
  margin-top: 8px;
}

.body-details__vessel {
  margin-left: 8px;
  margin-top: 8px;
  border-left: 3px solid #96F9FF;
  padding-left: 8px;
}

.body-details__vessel-details {
}

.body-details__vessel-detail {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

.body-details__vessel-detail-label {
  color: #3bffbd;
  text-transform: uppercase;
}

.body-details__vessel-detail-value {
  color: lightgray;
}

.body-details button {
  background: #96F9FF;
  border: none;
  color: #172d29;
  font-family: inherit;
  text-transform: uppercase;
  letter-spacing: 0.3em;
  padding-left: calc(0.3em + 6px);
  cursor: pointer;
}

.body-details button:hover {
  background: #3E9D98;
  color: #172d29;
}

.body-details__vessel-resource {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}

`)
document.adoptedStyleSheets = [...document.adoptedStyleSheets, styles]

const fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

function Facility({site, facility}) {
  return html`
    <div class="body-details__facility">
      <div class="body-details__facility-type">${facility.type}</div>
      <div class="body-details__facility-actions">
        <button class="body-details__facility-action" onclick=${() => uiState.overlay.value = { type: "build-vessel", facility, site }}>Build</button>
      </div>
    </div>
  `
}

function LandedVessel({configuration, site, bodyId}) {
  return html`
    <div class="body-details__vessel">
      <div class="body-details__vessel-name">${configuration.name}</div>
      <div class="body-details__vessel-details">
        <div class="body-details__vessel-detail">
          <div class="body-details__vessel-detail-label">Mass</div>
          <div class="body-details__vessel-detail-value">${parameterDisplay.mass.format(configuration.mass)}</div>
        </div>
        <div class="body-details__vessel-resources">
          <div class="body-details__vessel-resource">
            <div class="body-details__vessel-resource-name">V</div>
            <div class="body-details__vessel-resource-amount">${parameterDisplay.mass.format(configuration.resources.volatiles)}</div>
          </div>
          <div class="body-details__vessel-resource">
            <div class="body-details__vessel-resource-name">M</div>
            <div class="body-details__vessel-resource-amount">${parameterDisplay.mass.format(configuration.resources.metals)}</div>
          </div>
          <div class="body-details__vessel-resource">
            <div class="body-details__vessel-resource-name">R</div>
            <div class="body-details__vessel-resource-amount">${parameterDisplay.mass.format(configuration.resources.rareMetals)}</div>
          </div>
          <div class="body-details__vessel-resource">
            <div class="body-details__vessel-resource-name">U</div>
            <div class="body-details__vessel-resource-amount">${parameterDisplay.mass.format(configuration.resources.fissionables)}</div>
          </div>
        </div>
      </div>
      <div class="body-details__vessel-actions">
        <button onclick=${() => {
          const bodyTrajectory = universe.ephemeris.trajectories[bodyId]
          const body = universe.ephemeris.bodies[bodyId]
          const bodyState = {
            position: bodyTrajectory.evaluatePosition(universe.currentTime),
            velocity: bodyTrajectory.evaluateVelocity(universe.currentTime),
            mass: body.mass,
          }
          universe.vessels.push(new Vessel({configuration, initialState: initialOrbitState(bodyState, 200e3 + body.radius)}))
          site.vessels.splice(site.vessels.indexOf(configuration), 1)
          universe.recompute()
        }}>Launch</button>
      </div>
    </div>
  `
}

function Site({bodyId, site}) {
  return html`
    <div class="body-details__site">
      <div class="body-details__site-name">${site.name}</div>
      <div class="body-details__site-resources">
        <div class="body-details__site-resource">
          <div class="body-details__site-resource-name">O</div>
          <div class="body-details__site-resource-amount">${0}</div>
        </div>
        <div class="body-details__site-resource">
          <div class="body-details__site-resource-name">V</div>
          <div class="body-details__site-resource-amount">${0}</div>
        </div>
        <div class="body-details__site-resource">
          <div class="body-details__site-resource-name">M</div>
          <div class="body-details__site-resource-amount">${0}</div>
        </div>
        <div class="body-details__site-resource">
          <div class="body-details__site-resource-name">R</div>
          <div class="body-details__site-resource-amount">${0}</div>
        </div>
        <div class="body-details__site-resource">
          <div class="body-details__site-resource-name">U</div>
          <div class="body-details__site-resource-amount">${0}</div>
        </div>
      </div>
      <div class="body-details__site-facilities">
        ${site.facilities.map(facility => html`<${Facility} site=${site} facility=${facility} />`)}
      </div>
      ${site.vessels.length > 0 && html`
        <div class="body-details__site-vessels">
          ${site.vessels.map(vessel => html`<${LandedVessel} bodyId=${bodyId} site=${site} configuration=${vessel} />`)}
        </div>
      `}
    </div>
  `
}

export function BodyDetails({bodyId}) {
  const universe = useUniverse()
  const body = universe.ephemeris.bodies[bodyId]
  const sites = universe.sites[bodyId]
  return html`
    <div class="body-details">
      <div class="body-details__title">${body.name}</div>
      <div class="body-details__content">
        <div class="body-details__row">
          <div class="body-details__label">Mass</div>
          <div class="body-details__value">${body.mass.toPrecision(3)} kg</div>
        </div>
        <div class="body-details__row">
          <div class="body-details__label">Radius</div>
          <div class="body-details__value">${fmt.format(body.radius / 1e3)} km</div>
        </div>
        ${sites.map(site => html`<${Site} bodyId=${bodyId} site=${site} />`)}
      </div>
    </div>
  `
}
