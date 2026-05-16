import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

// --- SVGs for Chat UI Icons ---
const BOT_SVGS = {
    sparkle: <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3 6 6 3-6 3-3 6-3-6-6-3 6-3 3-6z"/></svg>,
    user: <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>,
    send: <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>,
    trash: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>,
    book: <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>,
    info: <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
};

export default function AIBot({ groqApiKey }) {
    // State Framework
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState('General');
    const [courseOutlines, setCourseOutlines] = useState([]);
    const [appContextCache, setAppContextCache] = useState({ schedule: [], exceptions: [], transport: [] });
    const [userMeta, setUserMeta] = useState({ session: '', section: '', name: 'Student' });

    const messagesEndRef = useRef(null);

    // --- Core Lifecycle Optimization ---
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
    }, [messages]);

    const autoScrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // --- Context Compilation Architecture (RAG Formulation engine) ---
    const buildSystemContextInstruction = () => {
        // Extract matching specific data elements corresponding to filters
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
            // Build real-time query parameters mapping historic records array to request payload
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

            // Client pipeline interfacing securely to Groq inference cluster endpoints
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

    // --- Sub-Component Parser for Rich Educational Text Layout Elements ---
    const StructuralMessageBlock = ({ text }) => {
        // Handles standard inline transformations cleanly via basic split mappings
        const paragraphTokens = text.split('\n\n');

        return (
            <div style={contentBodyStyle}>
                {paragraphTokens.map((paragraph, pIdx) => {
                    // Check for structured lists or block formats
                    if (paragraph.trim().startsWith('- ') || paragraph.trim().startsWith('* ')) {
                        const items = paragraph.split(/\n[*\-]\s/);
                        return (
                            <ul key={pIdx} style={ulStyle}>
                                {items.map((it, iIdx) => (
                                    <li key={iIdx} style={liStyle}>{it.replace(/^[*\-]\s/, '')}</li>
                                ))}
                            </ul>
                        );
                    }

                    // Check for structural text block tables formatting constructs
                    if (paragraph.includes('|')) {
                        const lines = paragraph.split('\n').filter(l => l.trim());
                        return (
                            <div key={pIdx} style={{ overflowX: 'auto', margin: '10px 0' }}>
                                <table style={tableLayoutContainer}>
                                    <tbody>
                                        {lines.map((line, lIdx) => {
                                            const columns = line.split('|').map(c => c.trim()).filter((_, i, a) => i > 0 && i < a.length - 1);
                                            const isHeaderRow = lIdx === 0;
                                            if (line.includes('---')) return null; // bypass styling split tracks
                                            return (
                                                <tr key={lIdx} style={isHeaderRow ? tableHeaderTrack : tableRowTrack}>
                                                    {columns.map((col, cIdx) => (
                                                        <td key={cIdx} style={isHeaderRow ? thCell : tdCell}>{col}</td>
                                                    ))}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        );
                    }

                    return <p key={pIdx} style={paragraphBlockStyle}>{paragraph}</p>;
                })}
            </div>
        );
    };

    return (
        <div style={botContainerWrapper}>
            {/* Header Ribbon Section */}
            <div style={botHeaderRibbon}>
                <div style={flexAlignRow}>
                    <div style={botAvatarBadge}>{BOT_SVGS.sparkle}</div>
                    <div>
                        <div style={botTitleLabel}>BSAI Academic Tutor</div>
                        <div style={botSubStatus}>
                            Session Section Framework Context Active
                        </div>
                    </div>
                </div>
                <button onClick={clearChatHistoryStateLog} style={clearMemoryActionBtn} title="Purge local chat cache thread logs">
                    {BOT_SVGS.trash} <span className="mobile-hide" style={{ marginLeft: '4px' }}>Clear Chat Log</span>
                </button>
            </div>

            {/* Scope Constraint Alert Notice Badge */}
            <div style={scopeAlertBadgeStrip}>
                {BOT_SVGS.info} <span>Educational Scope Engine Guardrails: Tracking schedule modifications, syllabus blueprints mapping blocks, and transit routing nodes matrices directly.</span>
            </div>

            {/* Interactive Dialogue Stream Box Canvas Container */}
            <div style={chatDialogueDisplayBox}>
                {messages.map((msg) => {
                    const isUserMessage = msg.sender === 'user';
                    return (
                        <div key={msg.id} style={isUserMessage ? dialogRowUserTrack : dialogRowBotTrack}>
                            <div style={isUserMessage ? userDialogueWrapperBubble : botDialogueWrapperBubble}>
                                <div style={metaHeaderLabelTrack(isUserMessage)}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {isUserMessage ? BOT_SVGS.user : BOT_SVGS.sparkle}
                                        {isUserMessage ? 'You' : 'Academic Core Engine'}
                                    </span>
                                    <span>{msg.timestamp}</span>
                                </div>
                                <StructuralMessageBlock text={msg.text} />
                            </div>
                        </div>
                    );
                })}

                {/* Simulated Real-Time Dynamic Interface Typing Component */}
                {isTyping && (
                    <div style={dialogRowBotTrack}>
                        <div style={botDialogueWrapperBubble}>
                            <div style={typingLoaderWrap}>
                                <div className="typing-dot" style={dotAnimationDelay(0)}></div>
                                <div className="typing-dot" style={dotAnimationDelay(0.2)}></div>
                                <div className="typing-dot" style={dotAnimationDelay(0.4)}></div>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Application Form Interaction Entry Module Base Container */}
            <form onSubmit={handleSendMessage} style={formInteractionPanelTray}>
                <div style={inputContainerBoxRel}>
                    <input 
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Inquire regarding lecture updates, syllabus blueprints, topics tutorials examples matrices..."
                        style={inputEntryFieldStyle}
                    />
                    <button type="submit" style={actionDispatchSubmissionBtn} disabled={!inputValue.trim()}>
                        {BOT_SVGS.send}
                    </button>
                </div>
            </form>

            <style>{`
                .typing-dot {
                    width: 8px;
                    height: 8px;
                    background-color: #002147;
                    border-radius: 50%;
                    display: inline-block;
                    animation: bounceLoaderState 1.4s infinite ease-in-out both;
                }
                @keyframes bounceLoaderState {
                    0%, 80%, 100% { transform: scale(0); }
                    40% { transform: scale(1.0); }
                }
            `}</style>
        </div>
    );
}

// --- Structural Theme Styling Specs Matrices Match Setup Styles Config ---
const botContainerWrapper = { display: 'flex', flexDirection: 'column', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', height: 'calc(100vh - 160px)', minHeight: '500px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' };
const botHeaderRibbon = { background: '#002147', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #F2A900' };
const flexAlignRow = { display: 'flex', alignItems: 'center', gap: '12px' };
const botAvatarBadge = { width: '36px', height: '36px', background: '#F2A900', borderRadius: '8px', color: '#002147', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const botTitleLabel = { color: '#fff', fontSize: '0.95rem', fontWeight: '900', letterSpacing: '0.5px' };
const botSubStatus = { color: '#93c5fd', fontSize: '0.7rem', fontWeight: '500' };
const clearMemoryActionBtn = { display: 'inline-flex', alignItems: 'center', background: 'rgba(239, 68, 68, 0.1)', color: '#fca5a5', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '6px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' };
const scopeAlertBadgeStrip = { background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', color: '#166534', padding: '6px 12px', fontSize: '0.65rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' };
const chatDialogueDisplayBox = { flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', background: '#f1f5f9' };
const dialogRowUserTrack = { display: 'flex', justifyContent: 'flex-end', width: '100%' };
const dialogRowBotTrack = { display: 'flex', justifyContent: 'flex-start', width: '100%' };
const userDialogueWrapperBubble = { maxWidth: '85%', background: '#002147', color: '#fff', borderRadius: '12px 12px 0 12px', padding: '12px 16px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' };
const botDialogueWrapperBubble = { maxWidth: '85%', background: '#ffffff', color: '#1e293b', borderRadius: '12px 12px 12px 0', padding: '12px 16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' };
const metaHeaderLabelTrack = (isUser) => ({ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '24px', fontSize: '0.65rem', fontWeight: 'bold', opacity: 0.7, marginBottom: '6px', color: isUser ? '#93c5fd' : '#475569', borderBottom: isUser ? '1px solid rgba(255,255,255,0.1)' : '1px solid #f1f5f9', paddingBottom: '4px' });
const formInteractionPanelTray = { background: '#fff', padding: '12px', borderTop: '1px solid #e2e8f0' };
const inputContainerBoxRel = { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' };
const inputEntryFieldStyle = { width: '100%', padding: '12px 48px 12px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#fff', outline: 'none', transition: 'all 0.2s', color: '#1e293b' };
const actionDispatchSubmissionBtn = { position: 'absolute', right: '8px', width: '32px', height: '32px', background: '#002147', color: '#F2A900', border: 'none', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' };
const contentBodyStyle = { fontSize: '0.85rem', lineHeight: '1.5', wordBreak: 'break-word' };
const paragraphBlockStyle = { margin: '0 0 8px 0', padding: 0 };
const ulStyle = { margin: '4px 0 8px 16px', padding: 0 };
const liStyle = { marginBottom: '4px' };
const typingLoaderWrap = { display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 0' };
const dotAnimationDelay = (delay) => ({ animationDelay: `${delay}s` });
const tableLayoutContainer = { width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', margin: '8px 0', border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' };
const tableHeaderTrack = { background: '#f1f5f9', fontWeight: 'bold', borderBottom: '2px solid #cbd5e1' };
const tableRowTrack = { borderBottom: '1px solid #e2e8f0' };
const thCell = { padding: '6px 10px', color: '#334155', textAlign: 'left', fontWeight: 'bold' };
const tdCell = { padding: '6px 10px', color: '#475569' };
