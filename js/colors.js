// Deterministic, maximally-spread, bright team colors.
// Golden-angle hue stepping: each successive team gets a hue as far as
// possible from every hue already used, without needing to know the final
// team count in advance. Same index always gives the same color.

const GOLDEN_ANGLE = 137.508;

function teamColor(index) {
  const hue = (index * GOLDEN_ANGLE) % 360;
  return `hsl(${hue.toFixed(1)}, 85%, 55%)`;
}
