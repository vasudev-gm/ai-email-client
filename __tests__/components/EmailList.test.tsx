import { render, screen, fireEvent } from "@testing-library/react"
import EmailList from "@/components/EmailList"
import { MOCK_EMAILS } from "@/lib/email-utils"

describe("EmailList", () => {
  it("renders email subjects", () => {
    render(
      <EmailList
        emails={MOCK_EMAILS.slice(0, 3)}
        currentFolder="INBOX"
        selectedEmailId={null}
        onSelectEmail={() => {}}
      />
    )
    expect(screen.getByText("Q4 Planning Meeting - Action Items")).toBeInTheDocument()
  })

  it("renders empty state when no emails", () => {
    render(
      <EmailList
        emails={[]}
        currentFolder="INBOX"
        selectedEmailId={null}
        onSelectEmail={() => {}}
      />
    )
    expect(screen.getByText(/no emails/i)).toBeInTheDocument()
  })

  it("supports select all and bulk action", () => {
    const onBulkAction = jest.fn()
    render(
      <EmailList
        emails={MOCK_EMAILS.slice(0, 2)}
        currentFolder="INBOX"
        selectedEmailId={null}
        onSelectEmail={() => {}}
        onBulkAction={onBulkAction}
      />
    )

    fireEvent.click(screen.getByLabelText(/select all/i))
    fireEvent.click(screen.getByRole("button", { name: /^archive$/i }))
    expect(onBulkAction).toHaveBeenCalledWith(["1", "2"], "archive")
  })

  it("supports mark all read", () => {
    const onBulkAction = jest.fn()
    render(
      <EmailList
        emails={MOCK_EMAILS.slice(0, 2)}
        currentFolder="INBOX"
        selectedEmailId={null}
        onSelectEmail={() => {}}
        onBulkAction={onBulkAction}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /read status actions/i }))
    fireEvent.click(screen.getByRole("menuitem", { name: /mark all read/i }))
    expect(onBulkAction).toHaveBeenCalledWith(["1"], "markRead")
  })
})
