// Decorative night sky behind the app (stars, shooting stars, bokeh). Hidden from screen readers.
const STARS = [[38, 6], [120, 3], [212, 10], [300, 4], [352, 14], [74, 25], [262, 23], [30, 50], [340, 56], [180, 66], [58, 83], [310, 90]]
const METEORS = [[85, -2, 0.6, 9], [108, 14, 3.4, 10], [62, -4, 6.1, 11], [105, 42, 8.2, 9.5], [98, 66, 4.8, 12]]
export function Sky() {
  return <div class="sky" aria-hidden="true">
    <i class="b" style="left:6%;top:8%;width:120px;height:120px;background:radial-gradient(circle,rgba(50,90,215,.36),transparent 70%)" />
    <i class="b" style="right:-10%;top:27%;width:200px;height:200px;background:radial-gradient(circle,rgba(25,65,190,.36),transparent 68%);animation-delay:-2.5s" />
    <i class="b" style="left:-12%;top:62%;width:220px;height:220px;background:radial-gradient(circle,rgba(30,70,190,.26),transparent 68%);animation-delay:-3s" />
    {STARS.map(([x, y], i) => <i class="s" style={`left:${x / 3.9}%;top:${y}%;animation-delay:-${(i * 0.7) % 3.4}s`} />)}
    {METEORS.map(([x, y, d, t]) => <i class="m" style={`left:${x}%;top:${y}%;animation-delay:${d}s;animation-duration:${t}s`} />)}
  </div>
}

/** Brand logo (white, for the dark theme). */
export const Logo = (p: { class?: string }) => <img class={'logo ' + (p.class || '')} src="/logo.webp" width="640" height="178" alt="MThanglee Studio" />
