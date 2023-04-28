/*
  Cohen-Sutherland line clipping algorithm
  from https://en.wikipedia.org/wiki/Cohen%E2%80%93Sutherland_algorithm
*/

export function cohenSutherlandLineClip(xmin, xmax, ymin, ymax, p0, p1) {
  const INSIDE = 0 // 0000
  const LEFT = 1   // 0001
  const RIGHT = 2  // 0010
  const BOTTOM = 4 // 0100
  const TOP = 8    // 1000

  function computeOutCode(x, y) {
    let code = INSIDE
    if (x < xmin) code |= LEFT
    else if (x > xmax) code |= RIGHT
    if (y < ymin) code |= BOTTOM
    else if (y > ymax) code |= TOP
    return code
  }

  let outcode0 = computeOutCode(p0.x, p0.y)
  let outcode1 = computeOutCode(p1.x, p1.y)
  let accept = false

  while (true) {
    if (!(outcode0 | outcode1)) {
      // bitwise OR is 0: both points inside window; trivially accept and exit loop
      accept = true
      break
    } else if (outcode0 & outcode1) {
      // bitwise AND is not 0: both points share an outside zone (LEFT, RIGHT, TOP,
      // or BOTTOM), so both must be outside window; exit loop (accept is false)
      break
    } else {
      // failed both tests, so calculate the line segment to clip
      // from an outside point to an intersection with clip edge
      let x, y

      // At least one endpoint is outside the clip rectangle; pick it.
      const outcodeOut = outcode1 > outcode0 ? outcode1 : outcode0

      // Now find the intersection point;
      // use formulas:
      //   slope = (y1 - y0) / (x1 - x0)
      //   x = x0 + (1 / slope) * (ym - y0), where ym is ymin or ymax
      //   y = y0 + slope * (xm - x0), where xm is xmin or xmax
      // No need to worry about divide-by-zero because, in each case, the
      // outcode bit being tested guarantees the denominator is non-zero
      if (outcodeOut & TOP) {           // point is above the clip window
        x = p0.x + (p1.x - p0.x) * (ymax - p0.y) / (p1.y - p0.y)
        y = ymax
      } else if (outcodeOut & BOTTOM) { // point is below the clip window
        x = p0.x + (p1.x - p0.x) * (ymin - p0.y) / (p1.y - p0.y)
        y = ymin
      } else if (outcodeOut & RIGHT) {  // point is to the right of clip window
        y = p0.y + (p1.y - p0.y) * (xmax - p0.x) / (p1.x - p0.x)
        x = xmax
      } else if (outcodeOut & LEFT) {   // point is to the left of clip window
        y = p0.y + (p1.y - p0.y) * (xmin - p0.x) / (p1.x - p0.x)
        x = xmin
      }

      // Now we move outside point to intersection point to clip
      // and get ready for next pass.
      if (outcodeOut === outcode0) {
        p0.x = x
        p0.y = y
        outcode0 = computeOutCode(p0.x, p0.y)
      } else {
        p1.x = x
        p1.y = y
        outcode1 = computeOutCode(p1.x, p1.y)
      }
    }
  }
  return accept
}
