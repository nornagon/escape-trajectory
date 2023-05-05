import { html } from 'preact/standalone'

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

`)
document.adoptedStyleSheets = [...document.adoptedStyleSheets, styles]

const fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1, minimumFractionDigits: 1 })

function Facility({facility}) {
  return html`
    <div class="body-details__facility">
      <div class="body-details__facility-type">${facility.type}</div>
      <div class="body-details__facility-actions">
        <button class="body-details__facility-action">Build</button>
      </div>
    </div>
  `
}

function Site({site}) {
  const facilities = site.facilities.map(facility => Facility({facility}))
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
      ${facilities}
    </div>
  `
}

export function BodyDetails({body}) {
  const sites = body.sites.map(site => Site({site}))
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
        ${sites}
      </div>
    </div>
  `
}
