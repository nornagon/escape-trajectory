import { html } from 'htm/preact'
import { uiState } from './ui-store.js'
import { BodyDetails } from './body-ui.js'
import { BuildVessel } from './build-vessel.js'

export function OverlayUI() {
  if (uiState.overlay.value?.type === 'build-vessel') {
    return html`<${BuildVessel} />`
  }
  if (uiState.selectedBody.value) {
    return html`<${BodyDetails} body=${uiState.selectedBody.value} />`
  }
  return null
}
