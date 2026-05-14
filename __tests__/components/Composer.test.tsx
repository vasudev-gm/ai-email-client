import { render, screen, fireEvent } from "@testing-library/react"
import Composer from "@/components/Composer"

describe("Composer", () => {
  it("renders compose form", () => {
    render(
      <Composer
        isOpen={true}
        onClose={() => {}}
        onSend={async () => {}}
      />
    )
    expect(screen.getByPlaceholderText(/recipients/i)).toBeInTheDocument()
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
})
