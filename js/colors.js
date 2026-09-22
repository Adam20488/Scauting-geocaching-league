function teamColor(index) {
  let hue = 0;
  let fraction = 180;
  let n = index;

  while (n > 0) {
    if (n % 2 === 1) {
      hue += fraction;
    }
    n = Math.floor(n / 2);
    fraction /= 2;
  }

  hue = (hue + 15) % 360;

  const lightness = 45 + (index % 2) * 20;
  const saturation = 80 + (index % 3) * 10;

  return `hsl(${hue.toFixed(1)}, ${saturation}%, ${lightness}%)`;
}
