import { ArrowRight, Clock3, Sparkles } from 'lucide-react'
import './mentor-workspace.css'

export function MentorWorkspace({ onOpenInvestigate }: { onOpenInvestigate: () => void }) {
  return (
    <div className="mentor-page">
      <header className="mentor-page-heading">
        <div>
          <span className="mentor-eyebrow">MENTOR</span>
          <h2>Mentor</h2>
          <p>Model-grounded explanations and conversations.</p>
        </div>
      </header>
      <section className="mentor-coming-soon" aria-labelledby="mentor-coming-soon-title">
        <span className="mentor-coming-soon-icon"><Sparkles size={23} /></span>
        <span className="mentor-coming-soon-label"><Clock3 size={13} /> COMING LATER</span>
        <h3 id="mentor-coming-soon-title">Mentor AI isn’t available yet</h3>
        <p>Live conversations and verified model explanations aren’t connected in this workspace. No sample chats or generated answers are shown.</p>
        <button className="mentor-primary-button" onClick={onOpenInvestigate}>Open Investigate <ArrowRight size={16} /></button>
      </section>
    </div>
  )
}
