/** Studio wordmark from the website: ink on Light, white on Dark (swapped in CSS by [data-theme]). */
export const Logo = (p: { class?: string }) => <span class={'logo ' + (p.class || '')}>
  <img class="on-light" src="/brand/logo-ink.webp" width="640" height="178" alt="MThanglee Studio" />
  <img class="on-dark" src="/brand/logo-white.webp" width="640" height="178" alt="" aria-hidden="true" />
</span>
