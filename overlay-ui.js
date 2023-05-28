import { html } from 'htm/preact'
import { uiState } from './ui-store.js'
import { BodyDetails } from './body-ui.js'
import { BuildVessel } from './build-vessel.js'

export function OverlayUI() {
  if (uiState.overlay?.type === 'build-vessel') {
    return html`<${BuildVessel} ...${uiState.overlay} />`
  }
  if (uiState.selectedBody) {
    return html`<${BodyDetails} bodyId=${uiState.selectedBody} />`
  }
  return null
}
