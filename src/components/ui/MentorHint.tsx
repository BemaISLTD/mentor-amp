import { ArrowRight, Check, Sparkles } from 'lucide-react'
import { useApp } from '../../context/useApp'
import { IconBubble } from './IconBubble'

export function MentorHint() {
  const { notify } = useApp()
  return <aside className="mentor-hint"><div className="mentor-hint-head"><IconBubble lime><Sparkles size={19} /></IconBubble><div><b>Contextual Mentor</b><small>Available in this workspace</small></div></div><p>“MYGA Reserve Model” has 3 connected published outputs and one formula override that needs review before the next projection.</p><div className="mentor-fact"><Check size={15} /><span><b>Verified model fact</b><small>Source: model v3.2 · Updated 2h ago</small></span></div><button onClick={() => notify('Mentor explanation opened')} className="button button-primary">Explain this model <ArrowRight size={15} /></button></aside>
}
