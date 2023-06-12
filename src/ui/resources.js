import { html } from 'htm/preact'
import { parameterDisplay } from '../modules.js'

const styles = new CSSStyleSheet()
styles.replaceSync(`
.resources {
  display: flex;
  flex-direction: column;
}

.resources .resource {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
}
`)
document.adoptedStyleSheets = [...document.adoptedStyleSheets, styles]

const resourceNames = {
  ore: 'O',
  volatiles: 'V',
  metals: 'M',
  rareMetals: 'R',
  fissionables: 'U',
}

export function Resources({resources}) {
  return html`
    <div class="resources">
      ${Object.entries(resourceNames).flatMap(([resource, name]) => {
        if (Object.prototype.hasOwnProperty.call(resources, resource)) {
          return [html`
            <div class="resource">
              <div class="resource-name">${name}</div>
              <div class="resource-amount">${parameterDisplay.mass.format(resources[resource])}</div>
            </div>
          `]
        }
      })}
    </div>
  `
}
