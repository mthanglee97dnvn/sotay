// Decorative backdrop: sapphire glow, a gold horizon arc and a thin gold frame. Hidden from screen readers.
export function Sky() {
  return <div class="sky" aria-hidden="true"><i class="glow" /><i class="arc" /><i class="side" /><i class="frame" /></div>
}

const GLINT = 'M12 0C12.8 7 17 11.2 24 12C17 12.8 12.8 17 12 24C11.2 17 7 12.8 0 12C7 11.2 11.2 7 12 0Z'
export const Glint = (p: { style: string }) => <svg class="glint" viewBox="0 0 24 24" style={p.style} aria-hidden="true"><path d={GLINT} fill="#f3e2bb" /></svg>
/** Brand logo (white, for the dark theme). `spark` adds a twinkling gold star on the logo's arc. */
export const Logo = (p: { class?: string; spark?: boolean }) => {
  const img = <img class={'logo ' + (p.class || '')} src="/logo.webp" width="640" height="178" alt="MThanglee Studio" />
  return p.spark ? <span class="logowrap">{img}<Glint style="right:22%;top:-4px;width:12px;height:12px" /><Glint style="left:6%;top:30%;width:8px;height:8px;animation-delay:-1.6s" /></span> : img
}
