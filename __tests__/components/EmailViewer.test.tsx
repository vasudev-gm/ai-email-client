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
      />
    )

    fireEvent.click(screen.getByRole("button", { name: /mark as not spam/i }))
    expect(onNotSpam).toHaveBeenCalledTimes(1)
  })
})
