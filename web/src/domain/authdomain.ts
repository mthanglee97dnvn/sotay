/** The custom domain serves Firebase's sign-in helper itself (/__/auth/*, copied in at deploy time).
 *  Signing in through the same domain keeps the redirect flow working on iPhone browsers that
 *  block cross-site storage, where a firebaseapp.com handler loses the result. */
export const OWN_DOMAIN = 'sotay.mthangleestudio.com'
export const firebaseOptions = <T extends { authDomain?: string }>(cfg: T, host: string): T =>
  host === OWN_DOMAIN ? { ...cfg, authDomain: OWN_DOMAIN } : cfg
