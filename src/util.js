// Format the given duration as Wd Xh Ym Zs, where W=days, X=hours, Y=minutes, Z=seconds
// If days is 0, omit it. If hours is 0, omit it. If minutes is 0, omit it.
export function formatDuration(seconds) {
  let days = Math.floor(seconds / 86400)
  let hours = Math.floor((seconds % 86400) / 3600)
  let minutes = Math.floor((seconds % 3600) / 60)
  let seconds2 = Math.floor(seconds % 60)
  let result = ""
  if (days > 0) result += `${days}d `
  if (hours > 0) result += `${hours}h `
  if (minutes > 0) result += `${minutes}m `
  result += `${seconds2}s`
  return result
}

// Yields all contiguous subsequences of length `step` from `generator`.
export function* sliding(generator, step) {
  let buffer = []
  for (const x of generator) {
    buffer.push(x)
    if (buffer.length === step) {
      yield buffer
      buffer = buffer.slice(1)
    }
  }
}

// Transform each element of `generator` with `f`.
export function* map(generator, f) {
  for (const x of generator) yield f(x)
}
