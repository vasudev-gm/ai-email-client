import { render, screen } from "@testing-library/react"
import EmailList from "@/components/EmailList"
import { MOCK_EMAILS } from "@/lib/email-utils"

describe("EmailList", () => {
  it("renders email subjects", () => {
    render(
      <EmailList
        emails={MOCK_EMAILS.slice(0, 3)}
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
        selectedEmailId={null}
        onSelectEmail={() => {}}
      />
    )
    expect(screen.getByText(/no emails/i)).toBeInTheDocument()
  })
})
