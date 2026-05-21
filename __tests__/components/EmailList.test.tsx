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
    expect(onBulkAction).toHaveBeenCalledWith(["1", "2"], "archive", undefined)
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

    const readStatusButton = screen.getByRole("button", { name: /read status actions/i })
    expect(readStatusButton).toBeInTheDocument()
    fireEvent.click(readStatusButton)
    fireEvent.click(screen.getByRole("menuitem", { name: /mark all read/i }))
    expect(onBulkAction).toHaveBeenCalledWith(["1"], "markRead", undefined)
  })

  it("shows unarchive in archived folder and dispatches unarchive action", () => {
    const onBulkAction = jest.fn()
    render(
      <EmailList
        emails={MOCK_EMAILS.slice(0, 2)}
        currentFolder="ARCHIVED"
        selectedEmailId={null}
        onSelectEmail={() => {}}
        onBulkAction={onBulkAction}
      />
    )

    fireEvent.click(screen.getByLabelText(/select all/i))
    fireEvent.click(screen.getByRole("button", { name: /^unarchive$/i }))

    expect(onBulkAction).toHaveBeenCalledWith(["1", "2"], "unarchive", undefined)
  })

  it("shows delete action and dispatches delete for selected emails", () => {
    const onBulkAction = jest.fn()
    render(
      <EmailList
        emails={MOCK_EMAILS.slice(0, 2)}
        currentFolder="DELETED"
        selectedEmailId={null}
        onSelectEmail={() => {}}
        onBulkAction={onBulkAction}
      />
    )

    fireEvent.click(screen.getByLabelText(/select all/i))
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }))

    expect(onBulkAction).toHaveBeenCalledWith(["1", "2"], "delete", undefined)
  })

  it("supports not spam selected action in junk folder", () => {
    const onBulkAction = jest.fn()
    render(
      <EmailList
        emails={MOCK_EMAILS.slice(0, 2)}
        currentFolder="JUNK"
        selectedEmailId={null}
        onSelectEmail={() => {}}
        onBulkAction={onBulkAction}
      />
    )

    fireEvent.click(screen.getByLabelText(/select all/i))
    fireEvent.click(screen.getByRole("button", { name: /^not spam$/i }))

    expect(onBulkAction).toHaveBeenCalledWith(["1", "2"], "notSpam", undefined)
  })

  it("supports move selected emails to folder", () => {
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
    fireEvent.change(screen.getByLabelText(/move selected emails to folder/i), { target: { value: "ARCHIVED" } })
    fireEvent.click(screen.getByRole("button", { name: /^move to$/i }))

    expect(onBulkAction).toHaveBeenCalledWith(["1", "2"], "move", "ARCHIVED")
  })

  it("does not show current folder in move targets", () => {
    render(
      <EmailList
        emails={MOCK_EMAILS.slice(0, 2)}
        currentFolder="INBOX"
        selectedEmailId={null}
        onSelectEmail={() => {}}
      />
    )

    const moveSelect = screen.getByLabelText(/move selected emails to folder/i) as HTMLSelectElement
    const optionValues = Array.from(moveSelect.options).map((option) => option.value)
    expect(optionValues).not.toContain("INBOX")
  })

  it("supports adding label to selected emails", () => {
    const onBulkAction = jest.fn()
    render(
      <EmailList
        emails={MOCK_EMAILS.slice(0, 2).map((email) => ({
          ...email,
          labels: [
            ...(email.labels || []),
            { labelId: "Important", label: { name: "Important", color: "#EF4444" } },
          ],
        }))}
        currentFolder="INBOX"
        selectedEmailId={null}
        onSelectEmail={() => {}}
        onBulkAction={onBulkAction}
      />
    )

    fireEvent.click(screen.getByLabelText(/select all/i))
    fireEvent.change(screen.getByLabelText(/choose existing label/i), { target: { value: "Important" } })
    fireEvent.click(screen.getByRole("button", { name: /^add label$/i }))

    expect(onBulkAction).toHaveBeenCalledWith(["1", "2"], "addLabel", "Important")
  })
})
