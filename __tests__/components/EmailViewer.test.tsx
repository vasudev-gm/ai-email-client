import { fireEvent, render, screen } from "@testing-library/react"
import EmailViewer from "@/components/EmailViewer"
import { MOCK_EMAILS } from "@/lib/email-utils"

jest.mock("@/components/AISummary", () => () => null)
jest.mock("@/components/ReplyDraft", () => () => null)

describe("EmailViewer", () => {
  it("calls onForward when Forward is clicked", () => {
    const onForward = jest.fn()

    render(
      <EmailViewer
        email={MOCK_EMAILS[0]}
        onBack={() => {}}
        onReply={() => {}}
        onForward={onForward}
        onDelete={() => {}}
        onRestore={() => {}}
        onNotSpam={() => {}}
        onMoveToFolder={() => {}}
        onAddLabel={() => {}}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /forward/i }))
    expect(onForward).toHaveBeenCalledTimes(1)
  })

  it("calls onReply when Reply is clicked", () => {
    const onReply = jest.fn()

    render(
      <EmailViewer
        email={MOCK_EMAILS[0]}
        onBack={() => {}}
        onReply={onReply}
        onForward={() => {}}
        onDelete={() => {}}
        onRestore={() => {}}
        onNotSpam={() => {}}
        onMoveToFolder={() => {}}
        onAddLabel={() => {}}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /^reply$/i }))
    expect(onReply).toHaveBeenCalledTimes(1)
  })

  it("calls onNotSpam when Mark as not spam is clicked for junk email", () => {
    const onNotSpam = jest.fn()

    render(
      <EmailViewer
        email={{ ...MOCK_EMAILS[0], folder: "JUNK" }}
        onBack={() => {}}
        onReply={() => {}}
        onForward={() => {}}
        onDelete={() => {}}
        onRestore={() => {}}
        onNotSpam={onNotSpam}
        onMoveToFolder={() => {}}
        onAddLabel={() => {}}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /mark as not spam/i }))
    expect(onNotSpam).toHaveBeenCalledTimes(1)
  })

  it("calls onMoveToFolder when Move To is clicked", () => {
    const onMoveToFolder = jest.fn()

    render(
      <EmailViewer
        email={MOCK_EMAILS[0]}
        onBack={() => {}}
        onReply={() => {}}
        onForward={() => {}}
        onDelete={() => {}}
        onRestore={() => {}}
        onNotSpam={() => {}}
        onMoveToFolder={onMoveToFolder}
        onAddLabel={() => {}}
      />
    )

    fireEvent.change(screen.getByLabelText(/move email to folder/i), { target: { value: "ARCHIVED" } })
    fireEvent.click(screen.getByRole("button", { name: /^move to$/i }))
    expect(onMoveToFolder).toHaveBeenCalledWith("ARCHIVED")
  })

  it("does not show current folder in move targets", () => {
    render(
      <EmailViewer
        email={{ ...MOCK_EMAILS[0], folder: "INBOX" }}
        onBack={() => {}}
        onReply={() => {}}
        onForward={() => {}}
        onDelete={() => {}}
        onRestore={() => {}}
        onNotSpam={() => {}}
        onMoveToFolder={() => {}}
        onAddLabel={() => {}}
      />
    )

    const moveSelect = screen.getByLabelText(/move email to folder/i) as HTMLSelectElement
    const optionValues = Array.from(moveSelect.options).map((option) => option.value)
    expect(optionValues).not.toContain("INBOX")
  })

  it("calls onAddLabel when Add Label is clicked", () => {
    const onAddLabel = jest.fn()

    render(
      <EmailViewer
        email={MOCK_EMAILS[0]}
        onBack={() => {}}
        onReply={() => {}}
        onForward={() => {}}
        onDelete={() => {}}
        onRestore={() => {}}
        onNotSpam={() => {}}
        onMoveToFolder={() => {}}
        onAddLabel={onAddLabel}
        existingLabels={["Important"]}
      />
    )

    fireEvent.change(screen.getByLabelText(/choose existing label/i), { target: { value: "Important" } })
    fireEvent.click(screen.getByRole("button", { name: /^add label$/i }))
    expect(onAddLabel).toHaveBeenCalledWith("Important")
  })
})
