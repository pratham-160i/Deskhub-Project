/** True on GitHub Pages (no Node API); use embedded db + localStorage. */
export function useStaticDataMode() {
  return typeof location !== 'undefined' && /\.github\.io$/i.test(location.hostname)
}
