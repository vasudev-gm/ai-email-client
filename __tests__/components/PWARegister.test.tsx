import { render, waitFor } from "@testing-library/react"
import PWARegister from "@/components/PWARegister"

describe("PWARegister", () => {
  it("registers the service worker when supported", async () => {
    const register = jest.fn().mockResolvedValue(undefined)
    Object.defineProperty(window.navigator, "serviceWorker", {
      configurable: true,
      value: { register },
    })

    render(<PWARegister />)

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith("/sw.js")
    })
  })

  it("does nothing when service worker is unavailable", () => {
    Object.defineProperty(window.navigator, "serviceWorker", {
      configurable: true,
      value: undefined,
    })

    expect(() => render(<PWARegister />)).not.toThrow()
  })
})
