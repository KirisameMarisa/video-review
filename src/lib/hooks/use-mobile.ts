import * as React from "react"

const MOBILE_BREAKPOINT = 768

// A phone held sideways is wider than the breakpoint but still needs the sidebar as a sheet.
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px), ((pointer: coarse) and (max-height: ${MOBILE_BREAKPOINT - 1}px))`

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY)
    const onChange = () => {
      setIsMobile(mql.matches)
    }
    mql.addEventListener("change", onChange)
    onChange()
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
