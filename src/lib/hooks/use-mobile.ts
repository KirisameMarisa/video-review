import * as React from "react"

// Below the sidebar breakpoint, or a phone held sideways: the one test the `mobile` CSS variant repeats.
const MOBILE_QUERY = "(max-width: 767px), ((pointer: coarse) and (max-height: 767px))"

// False until mounted, so the server and the first client render agree.
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY)
    const onChange = () => setIsMobile(mql.matches)

    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
