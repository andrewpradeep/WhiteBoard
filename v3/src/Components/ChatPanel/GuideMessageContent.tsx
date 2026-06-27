import { ChatMessageGuide } from "./chatHistory";

interface GuideMessageContentProps {
    guide: ChatMessageGuide;
}

const GuideMessageContent = ({ guide }: GuideMessageContentProps) => (
    <>
        <p className="chat-message-guide-lead">{guide.lead}</p>
        {guide.sections.map((section) => (
            <section className="chat-message-guide-section" key={section.title}>
                <p className="chat-message-guide-section-title">{section.title}</p>
                <ul className="chat-message-guide-list">
                    {section.examples.map((example) => (
                        <li key={example}>{example}</li>
                    ))}
                </ul>
            </section>
        ))}
        {guide.footer && <p className="chat-message-guide-footer">{guide.footer}</p>}
    </>
);

export default GuideMessageContent;
