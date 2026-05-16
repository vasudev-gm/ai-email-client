import { render, screen, fireEvent } from "@testing-library/react"
import Composer from "@/components/Composer"

jest.mock("@/store/emailStore", () => ({
  useEmailStore: () => ({ localAIMode: "heuristic" }),
}))

describe("Composer", () => {
  it("renders compose form", () => {
    render(
      <Composer
        isOpen={true}
        onClose={() => {}}
        onSend={async () => {}}
      />
    )
    expect(screen.getByPlaceholderText(/recipient@example\.com/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/subject/i)).toBeInTheDocument()
  })

  it("calls onClose when cancel clicked", () => {
    const onClose = jest.fn()
    render(
      <Composer
        isOpen={true}
        onClose={onClose}
        onSend={async () => {}}
      />
    )
    fireEvent.click(screen.getByText(/cancel/i))
    expect(onClose).toHaveBeenCalled()
  })

  it("fills content using AI Assist", async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ draft: "AI generated draft body" }),
    })
    global.fetch = fetchMock as unknown as typeof fetch

    render(
      <Composer
        isOpen={true}
        onClose={() => {}}
        onSend={async () => {}}
      />
    )

    fireEvent.change(screen.getByPlaceholderText(/email subject/i), {
      target: { value: "Subject" },
    })
    fireEvent.click(screen.getByRole("button", { name: /ai assist/i }))

    expect(await screen.findByDisplayValue("AI generated draft body")).toBeInTheDocument()
  })
})
