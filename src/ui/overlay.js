import { html } from 'htm/preact'
import { uiState } from './store.js'
import { BodyDetails } from './body.js'
import { VesselDetails } from './vessel.js'
import { BuildVessel } from './build-vessel.js'

export function OverlayUI() {
  if (uiState.overlay?.type === 'build-vessel') {
    return html`<${BuildVessel} ...${uiState.overlay} />`
  }
  if (uiState.selection?.type === 'body') {
    return html`<${BodyDetails} bodyId=${uiState.selection.index} />`
  } else if (uiState.selection?.type === 'vessel') {
    return html`<${VesselDetails} vesselId=${uiState.selection.index} />`
  }
  return null
}
