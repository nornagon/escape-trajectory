import { html } from 'https://esm.sh/htm/preact/standalone'

export function BodyDetails({body}) {
  return html`
    <div class="body-details">
      <div class="body-details__title">${body.name}</div>
      <div class="body-details__content">
        <div class="body-details__row">
          <div class="body-details__label">Mass</div>
          <div class="body-details__value">${body.mass.toPrecision(3)} kg</div>
        </div>
      </div>
    </div>
  `
}
