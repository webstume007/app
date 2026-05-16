import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- Minimalist Modern SVGs for Chat UI Icons ---
const BOT_SVGS = {
    sparkle: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    user: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>,
    send: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>,
    trash: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
    book: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>,
    info: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
};

export default function AIBot({ groqApiKey }) {
    // State Framework (ALL original state preserved)
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState('General');
    const [courseOutlines, setCourseOutlines] = useState([]);
    const [appContextCache, setAppContextCache] = useState({ schedule: [], exceptions: [], transport: [] });
    const [userMeta, setUserMeta] = useState({ session: '', section: '', name: 'Student' });

    const messagesEndRef = useRef(null);

    // --- Core Lifecycle Optimization (Unchanged Logic) ---
    useEffect(() => {
        // 1. Hydrate User Preferences & Meta Elements from local storage state
        const savedSelection = localStorage.getItem('iub_user_selection');
        const savedRoll = localStorage.getItem('iub_my_roll');
        let session = '';
        let section = 'GUEST';

        if (savedSelection) {
            const parsed = JSON.parse(savedSelection);
            session = parsed.session || parsed.semester || '';
            section = parsed.section || 'GUEST';
            setUserMeta(prev => ({ ...prev, session, section }));
        }

        // 2. Hydrate offline cache contextual parameters
        const savedOffline = localStorage.getItem('iub_offline_data');
        if (savedOffline) {
            try {
                const parsed = JSON.parse(savedOffline);
                setAppContextCache({
                    schedule: parsed.rawData || [],
                    exceptions: parsed.exceptions || [],
                    transport: parsed.pointsData || []
                });
            } catch (e) {
                console.error("Context layer hydration initialization failed", e);
            }
        }

        // 3. Serialized chat narrative historical array extraction from client storage array
        const key = `iub_chat_history_${session}_${section}`;
        const savedChat = localStorage.getItem(key);
        if (savedChat) {
            setMessages(JSON.parse(savedChat));
        } else {
            setMessages([
                {
                    id: 'welcome',
                    sender: 'bot',
                    text: `Hello! I am your AI Assistant. I have indexed your class schedule, transport point logs, and syllabus matrices. Ask me anything about your course metrics, lecture notes, academic examples, or class cancel/confirm structural changes!`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            ]);
        }

        // 4. Extract programmatic syllabus metadata structures via Supabase target matching
        if (session && section && section !== 'GUEST') {
            const fetchOutlines = async () => {
                const { data, error } = await supabase
                    .from('course_outlines')
                    .select('*')
                    .eq('session', session)
                    .eq('section', section);
                
                if (data && !error) {
                    setCourseOutlines(data);
                }
            };
            fetchOutlines();
        }
    }, []);

    // --- Synchronize Mutation State Logs back onto Local Matrix Array ---
    useEffect(() => {
        if (userMeta.session || userMeta.section) {
            const key = `iub_chat_history_${userMeta.session}_${userMeta.section}`;
            localStorage.setItem(key, JSON.stringify(messages));
        }
        autoScrollToBottom();
    }, [messages, isTyping]);

    const autoScrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // --- Context Compilation Architecture (Unchanged Logic) ---
    const buildSystemContextInstruction = () => {
        const outlineContext = courseOutlines.map(o => 
            `Subject: ${o.subject}\nTeacher: ${o.teacher || 'N/A'}\nWeekly Outline Details: ${o.weekly_plan || 'N/A'}\nLearning Objectives: ${o.objectives || 'N/A'}`
        ).join("\n\n");

        const baseScheduleContext = appContextCache.schedule.map(s => 
            `- ${s.day}: ${s.course} from ${s.start_time} to ${s.end_time} in Room ${s.room} (Instructor: ${s.teacher})`
        ).join("\n");

        const exceptionsContext = appContextCache.exceptions.map(e =>
            `- Class ID Reference ${e.base_schedule_id} status modified to: ${e.status} on date ${e.exception_date} ${e.new_room ? '(New Room: ' + e.new_room + ')' : ''}`
        ).join("\n");

        const transportContext = appContextCache.transport.map(t =>
            `- Route ${t.route}: Departs at ${t.departure_time} (${t.is_saturday ? 'Saturday Only Schedule' : 'Regular Mon-Fri Run'})`
        ).join("\n");

        return `You are the highly advanced, official dynamic IUB AI Academic Assistant, deployed to guide university students directly regarding their current semester tracking. 

Here is the immutable operational framework and dataset you must abide by:
1. USER METADATA CONTEXT: The active user is registered in Session: ${userMeta.session || 'N/A'} and Section: ${userMeta.section || 'GUEST'}.
2. OFFICIAL COURSE OUTLINES (SUPABASE SOURCE):
${outlineContext || "No custom course outline profiles mapped for this section configuration."}
3. CURRENT ACTIVE SCHEDULE LOGS:
${baseScheduleContext || "No general template schedules loaded."}
4. LIVE TIMETABLE EXCEPTIONS (CANCELLATIONS/RESCHEDULES):
${exceptionsContext || "No dynamic schedule alteration overrides logged for this runtime block."}
5. TRANSPORT TIMINGS (ROUTE LOGS):
${transportContext || "No active operational transit parameters logged."}

CRITICAL RULES OF ENGAGEMENT:
- Format your output strictly using Markdown (use ### for headings, ** for bold, and | tables |). 
- Strictly limit your programmatic responses to education conversation, examples, conceptual definitions, academic diagram descriptions, presentations templates structural mapping, document breakdowns, and planning matrices.
- Use clean formatting, tables, lists, text structures, blockquotes, code wrappers, or formulas to structure high-density knowledge files cleanly.
- You have deep operational context regarding classroom numbers, standard structural schedules, transit points logs, and lecture exception structures (cancelled vs confirmed status updates). 
- ABSOLUTELY PROHIBITED: You do not possess structural permissions maps for viewing personalized numerical attendance data properties. If asked for attendance, state politely that attendance matrices must be evaluated safely via the dedicated custom circular dashboards interface inside the Attendance view block directly.
- Maintain a highly sophisticated, adaptive, supportive yet peer-like academic posture. Provide actionable answers concisely without fluff.`;
    };

    // --- Message Processing Dispatch Engine ---
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const studentMessageText = inputValue.trim();
        const timestampString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        const newUserMessage = {
            id: `msg-${Date.now()}-user`,
            sender: 'user',
            text: studentMessageText,
            timestamp: timestampString
        };

        setMessages(prev => [...prev, newUserMessage]);
        setInputValue('');
        setIsTyping(true);

        try {
            const memoryHorizonArray = messages.slice(-10).map(m => ({
                role: m.sender === 'user' ? 'user' : 'assistant',
                content: m.text
            }));

            const systemContextBlock = {
                role: 'system',
                content: buildSystemContextInstruction()
            };

            const targetPayloadMessages = [
                systemContextBlock,
                ...memoryHorizonArray,
                { role: 'user', content: studentMessageText }
            ];

            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${groqApiKey || process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: targetPayloadMessages,
                    temperature: 0.3,
                    max_tokens: 1500
                })
            });

            const responseData = await response.json();
            const aiGeneratedText = responseData?.choices?.[0]?.message?.content || "I encountered an optimization block processing this prompt request pipeline. Please re-verify data endpoints transmission constraints.";

            const newBotMessage = {
                id: `msg-${Date.now()}-bot`,
                sender: 'bot',
                text: aiGeneratedText,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            setMessages(prev => [...prev, newBotMessage]);

        } catch (error) {
            console.error("AI Thread Engine Error Execution:", error);
            setMessages(prev => [...prev, {
                id: `msg-${Date.now()}-err`,
                sender: 'bot',
                text: "An execution timeout anomaly occurred in the remote network pipeline interface layer. Please check your network connection status parameters.",
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const clearChatHistoryStateLog = () => {
        if (window.confirm("Are you sure you want to completely flush the localized device memory ledger for this course chat workspace thread?")) {
            setMessages([
                {
                    id: 'welcome-reset',
                    sender: 'bot',
                    text: `Localized memory registers have been successfully purged. Fresh interface context initialized. How can I assist your educational goals today?`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            ]);
        }
    };

    // --- Sub-Component Parser Upgraded for Real Markdown ---
    const StructuralMessageBlock = ({ text }) => {
        // We preserved your function entirely, but upgraded the return body
        // to parse real Markdown (GPT standard output: ###, **, | tables |)
        return (
            <div className="modern-markdown-body" style={contentBodyStyle}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {text}
                </ReactMarkdown>
            </div>
        );
    };

    return (
        <div className="ai-chat-wrapper" style={botContainerWrapper}>
            {/* Minimal Header Ribbon Section */}
            <div style={botHeaderRibbon}>
                <div style={flexAlignRow}>
                    <div style={botAvatarBadge}>{BOT_SVGS.sparkle}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={botTitleLabel}>AI Academic Tutor</div>
                        <div style={botSubStatus}>
                            {userMeta.session || 'Session'} • {userMeta.section || 'Section'} • Active
                        </div>
                    </div>
                </div>
                <button onClick={clearChatHistoryStateLog} style={clearMemoryActionBtn} title="Purge local chat cache">
                    {BOT_SVGS.trash} <span className="mobile-hide" style={{ marginLeft: '6px' }}>Clear</span>
                </button>
            </div>

            {/* Scope Constraint Alert Notice Badge */}
            <div style={scopeAlertBadgeStrip}>
                <span style={{ marginTop: '2px' }}>{BOT_SVGS.info}</span> 
                <span>Engine Context: Active schedule, syllabus mapping, and transit routing nodes directly.</span>
            </div>

            {/* Interactive Dialogue Stream Box Canvas Container */}
            <div style={chatDialogueDisplayBox}>
                <div style={messagesConstraintBox}>
                    {messages.map((msg) => {
                        const isUserMessage = msg.sender === 'user';
                        return (
                            <div key={msg.id} style={isUserMessage ? dialogRowUserTrack : dialogRowBotTrack}>
                                {!isUserMessage && (
                                    <div style={botIconWrapper}>{BOT_SVGS.sparkle}</div>
                                )}
                                <div style={isUserMessage ? userDialogueWrapperBubble : botDialogueWrapperBubble}>
                                    <div style={metaHeaderLabelTrack(isUserMessage)}>
                                        <span style={{ fontWeight: 600 }}>{isUserMessage ? 'You' : 'Academic Core'}</span>
                                        <span style={{ fontWeight: 400, opacity: 0.6 }}>{msg.timestamp}</span>
                                    </div>
                                    <StructuralMessageBlock text={msg.text} />
                                </div>
                            </div>
                        );
                    })}

                    {/* Simulated Real-Time Dynamic Interface Typing Component */}
                    {isTyping && (
                        <div style={dialogRowBotTrack}>
                            <div style={botIconWrapper}>{BOT_SVGS.sparkle}</div>
                            <div style={botDialogueWrapperBubble}>
                                <div style={typingLoaderWrap}>
                                    <div className="typing-dot" style={dotAnimationDelay(0)}></div>
                                    <div className="typing-dot" style={dotAnimationDelay(0.2)}></div>
                                    <div className="typing-dot" style={dotAnimationDelay(0.4)}></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} style={{ height: '10px' }} />
                </div>
            </div>

            {/* Application Form Interaction Entry Module */}
            <form onSubmit={handleSendMessage} style={formInteractionPanelTray}>
                <div style={inputContainerBoxRel}>
                    <input 
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Ask about lectures, syllabus, schedules..."
                        style={inputEntryFieldStyle}
                        disabled={isTyping}
                    />
                    <button type="submit" style={actionDispatchSubmissionBtn(inputValue.trim())} disabled={!inputValue.trim()}>
                        {BOT_SVGS.send}
                    </button>
                </div>
            </form>

            <style>{`
                .ai-chat-wrapper {
                    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                }
                .modern-markdown-body p { margin-bottom: 0.75rem; }
                .modern-markdown-body p:last-child { margin-bottom: 0; }
                .modern-markdown-body h1, .modern-markdown-body h2, .modern-markdown-body h3 { font-weight: 600; color: #111827; margin-top: 1.25rem; margin-bottom: 0.5rem; }
                .modern-markdown-body h3 { font-size: 1.05rem; }
                .modern-markdown-body ul, .modern-markdown-body ol { margin-bottom: 1rem; padding-left: 1.5rem; }
                .modern-markdown-body li { margin-bottom: 0.25rem; }
                .modern-markdown-body strong { font-weight: 600; color: #111827; }
                .modern-markdown-body code { font-family: ui-monospace, monospace; background: rgba(0,0,0,0.05); padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.85em; }
                .modern-markdown-body pre code { display: block; padding: 1rem; overflow-x: auto; background: #1e293b; color: #f8fafc; border-radius: 8px; }
                .modern-markdown-body table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.85rem; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
                .modern-markdown-body th { background: #f8fafc; text-align: left; font-weight: 600; padding: 8px 12px; border-bottom: 2px solid #e2e8f0; }
                .modern-markdown-body td { padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }

                .typing-dot {
                    width: 6px;
                    height: 6px;
                    background-color: #94a3b8;
                    border-radius: 50%;
                    display: inline-block;
                    animation: bounceLoaderState 1.4s infinite ease-in-out both;
                }
                @keyframes bounceLoaderState {
                    0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
                    40% { opacity: 1; transform: scale(1.1); }
                }
            `}</style>
        </div>
    );
}

// --- Structural Theme Styling Specs Matrices Match Setup Styles Config ---
const botContainerWrapper = { display: 'flex', flexDirection: 'column', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', height: 'calc(100vh - 160px)', minHeight: '500px', overflow: 'hidden', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)' };
const botHeaderRibbon = { background: '#ffffff', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' };
const flexAlignRow = { display: 'flex', alignItems: 'center', gap: '12px' };
const botAvatarBadge = { width: '32px', height: '32px', background: '#10a37f', borderRadius: '8px', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const botTitleLabel = { color: '#0f172a', fontSize: '0.9rem', fontWeight: '600' };
const botSubStatus = { color: '#64748b', fontSize: '0.7rem', fontWeight: '500' };
const clearMemoryActionBtn = { display: 'inline-flex', alignItems: 'center', background: 'transparent', color: '#94a3b8', border: 'none', padding: '6px', fontSize: '0.75rem', cursor: 'pointer', transition: 'color 0.2s' };
const scopeAlertBadgeStrip = { background: '#f8fafc', borderBottom: '1px solid #f1f5f9', color: '#64748b', padding: '8px 20px', fontSize: '0.7rem', display: 'flex', alignItems: 'flex-start', gap: '8px' };
const chatDialogueDisplayBox = { flex: 1, padding: '20px', overflowY: 'auto', background: '#ffffff' };
const messagesConstraintBox = { maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' };
const dialogRowUserTrack = { display: 'flex', justifyContent: 'flex-end', width: '100%' };
const dialogRowBotTrack = { display: 'flex', justifyContent: 'flex-start', width: '100%', gap: '12px' };
const botIconWrapper = { width: '28px', height: '28px', background: '#10a37f', color: '#fff', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' };
const userDialogueWrapperBubble = { maxWidth: '75%', background: '#f1f5f9', color: '#0f172a', borderRadius: '12px', padding: '12px 16px' };
const botDialogueWrapperBubble = { flex: 1, maxWidth: '100%', color: '#334155', borderRadius: '0', padding: '0 0 12px 0' };
const metaHeaderLabelTrack = (isUser) => ({ display: 'flex', gap: '8px', fontSize: '0.75rem', marginBottom: '4px', color: isUser ? '#64748b' : '#0f172a' });
const formInteractionPanelTray = { background: '#ffffff', padding: '16px 20px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'center' };
const inputContainerBoxRel = { position: 'relative', display: 'flex', alignItems: 'center', width: '100%', maxWidth: '800px' };
const inputEntryFieldStyle = { width: '100%', padding: '14px 48px 14px 16px', borderRadius: '24px', border: '1px solid #cbd5e1', fontSize: '0.9rem', background: '#ffffff', outline: 'none', transition: 'border-color 0.2s', color: '#0f172a', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' };
const actionDispatchSubmissionBtn = (active) => ({ position: 'absolute', right: '8px', width: '32px', height: '32px', background: active ? '#10a37f' : '#f1f5f9', color: active ? '#ffffff' : '#94a3b8', border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: active ? 'pointer' : 'default', transition: 'all 0.2s' });
const contentBodyStyle = { fontSize: '0.9rem', lineHeight: '1.6', wordBreak: 'break-word' };
const typingLoaderWrap = { display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 0' };
const dotAnimationDelay = (delay) => ({ animationDelay: `${delay}s` });
