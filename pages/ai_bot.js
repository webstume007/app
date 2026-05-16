import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- Minimalist Modern SVGs for Chat UI Icons ---
const ICONS = {
    user: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
    send: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>, // Clean left-to-right arrow
    trash: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
};

// Reusable Favicon Component
const IubAvatar = () => (
    <img src="/favicon.ico" alt="IUB Assistant" style={{ width: '22px', height: '22px', borderRadius: '50%', objectFit: 'contain' }} />
);

export default function AIBot({ groqApiKey }) {
    // State Framework (ALL original state preserved)
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState('General');
    const [courseOutlines, setCourseOutlines] = useState([]);
    const [appContextCache, setAppContextCache] = useState({ schedule: [], exceptions: [], transport: [] });
    const [userMeta, setUserMeta] = useState({ session: '', section: '', name: 'Student', semester: '' });

    const messagesEndRef = useRef(null);

    // Dynamic Semester Calculator based on Session
    const calculateSemester = (sessionStr) => {
        if (!sessionStr) return 'Unknown Semester';
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        // Assume Spring is first half of year (Jan-Jun), Fall is second half (Jul-Dec)
        const currentSeason = currentDate.getMonth() < 6 ? 0 : 1; 
        
        const match = sessionStr.toLowerCase().match(/(spring|fall)\s+(\d{4})/);
        if (match) {
            const entrySeason = match[1] === 'spring' ? 0 : 1;
            const entryYear = parseInt(match[2]);
            
            let semesters = (currentYear - entryYear) * 2 + (currentSeason - entrySeason) + 1;
            if (semesters > 0) {
                const suffix = semesters === 1 ? 'st' : semesters === 2 ? 'nd' : semesters === 3 ? 'rd' : 'th';
                return `${semesters}${suffix} Semester`;
            }
        }
        return 'Unknown Semester';
    };

    // --- Core Lifecycle Optimization (Unchanged Logic) ---
    useEffect(() => {
        // 1. Hydrate User Preferences & Meta Elements from local storage state
        const savedSelection = localStorage.getItem('iub_user_selection');
        const savedRoll = localStorage.getItem('iub_my_roll');
        let session = '';
        let section = 'GUEST';
        let userName = 'Student';

        if (savedSelection) {
            const parsed = JSON.parse(savedSelection);
            session = parsed.session || parsed.semester || '';
            section = parsed.section || 'GUEST';
            userName = parsed.name || 'Student';
            const calculatedSem = calculateSemester(session);
            setUserMeta(prev => ({ ...prev, session, section, name: userName, semester: calculatedSem }));
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
            // New strict minimal greeting msg
            setMessages([
                {
                    id: 'welcome',
                    sender: 'bot',
                    text: `Hi, I am IUB AI Assitant, How Can I help you in Schedule, Course Outline, Points Timing and Your Section's Teachers Info?`,
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

    // --- Context Compilation Architecture (Unchanged Logic, added Semester logic) ---
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

        return `You are the highly advanced, official dynamic IUB Assistant AI, deployed to guide university students directly regarding their current semester tracking. 

Here is the immutable operational framework and dataset you must abide by:
1. USER METADATA CONTEXT: The active user is registered in Session: ${userMeta.session || 'N/A'} which makes it their ${userMeta.semester}. Their Section is: ${userMeta.section || 'GUEST'}. User Name: ${userMeta.name}. You must structure your conversations acknowledging their current ${userMeta.semester} and section.
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
        if (window.confirm("Are you sure you want to clear this chat conversation?")) {
            setMessages([
                {
                    id: 'welcome-reset',
                    sender: 'bot',
                    text: `Hi, I am IUB AI Assitant, How Can I help you in Schedule, Course Outline, Points Timing and Your Section's Teachers Info?`,
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            ]);
        }
    };

    // --- Sub-Component Parser Upgraded for Real Markdown ---
    const StructuralMessageBlock = ({ text }) => {
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
                    <div style={botAvatarBadge}><IubAvatar /></div>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <div style={botTitleLabel}>IUB Assistant AI</div>
                        <div style={botSubStatus}>
                            {userMeta.semester || userMeta.session || 'Session'} • {userMeta.section || 'Section'}
                        </div>
                    </div>
                </div>
                <button onClick={clearChatHistoryStateLog} style={clearMemoryActionBtn} title="Clear Chat">
                    {ICONS.trash}
                </button>
            </div>

            {/* Interactive Dialogue Stream Box Canvas Container */}
            <div style={chatDialogueDisplayBox}>
                <div style={messagesConstraintBox}>
                    {messages.map((msg) => {
                        const isUserMessage = msg.sender === 'user';
                        return (
                            <div key={msg.id} style={isUserMessage ? dialogRowUserTrack : dialogRowBotTrack}>
                                {!isUserMessage && (
                                    <div style={botIconWrapper}><IubAvatar /></div>
                                )}
                                <div style={isUserMessage ? userDialogueWrapperBubble : botDialogueWrapperBubble}>
                                    <StructuralMessageBlock text={msg.text} />
                                </div>
                            </div>
                        );
                    })}

                    {/* Simulated Real-Time Dynamic Interface Typing Component */}
                    {isTyping && (
                        <div style={dialogRowBotTrack}>
                            <div style={botIconWrapper}><IubAvatar /></div>
                            <div style={botDialogueWrapperBubble}>
                                <div style={typingLoaderWrap}>
                                    <div className="typing-dot" style={dotAnimationDelay(0)}></div>
                                    <div className="typing-dot" style={dotAnimationDelay(0.2)}></div>
                                    <div className="typing-dot" style={dotAnimationDelay(0.4)}></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} style={{ height: '2px' }} />
                </div>
            </div>

            {/* Ultra Minimal Pill Input Form */}
            <form onSubmit={handleSendMessage} style={formInteractionPanelTray}>
                <div style={inputContainerBoxRel}>
                    <input 
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Message AI..."
                        style={inputEntryFieldStyle}
                        disabled={isTyping}
                    />
                    <button type="submit" style={actionDispatchSubmissionBtn(inputValue.trim())} disabled={!inputValue.trim()}>
                        {ICONS.send}
                    </button>
                </div>
            </form>

            <style>{`
                .ai-chat-wrapper {
                    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                    animation: slideUpFade 0.4s ease-out forwards;
                }
                
                @keyframes slideUpFade {
                    0% { opacity: 0; transform: translateY(15px); }
                    100% { opacity: 1; transform: translateY(0); }
                }

                .modern-markdown-body p { margin-bottom: 0.85rem; }
                .modern-markdown-body p:last-child { margin-bottom: 0; }
                .modern-markdown-body h1, .modern-markdown-body h2, .modern-markdown-body h3 { font-weight: 600; color: #111827; margin-top: 1.25rem; margin-bottom: 0.5rem; }
                .modern-markdown-body h3 { font-size: 1.05rem; }
                .modern-markdown-body ul, .modern-markdown-body ol { margin-bottom: 1rem; padding-left: 1.5rem; }
                .modern-markdown-body li { margin-bottom: 0.25rem; }
                .modern-markdown-body strong { font-weight: 600; color: #111827; }
                .modern-markdown-body code { font-family: ui-monospace, monospace; background: rgba(0,0,0,0.04); padding: 0.2rem 0.4rem; border-radius: 4px; font-size: 0.85em; color: #cf222e; }
                .modern-markdown-body pre code { display: block; padding: 1rem; overflow-x: auto; background: #f6f8fa; color: #24292f; border-radius: 8px; border: 1px solid #d0d7de; font-size: 0.85rem; line-height: 1.45; }
                
                /* Fully Mobile Responsive Table Styling */
                .modern-markdown-body table { 
                    display: block; 
                    max-width: 100%; 
                    overflow-x: auto; 
                    white-space: nowrap; 
                    border-collapse: collapse; 
                    margin: 1rem 0; 
                    font-size: 0.85rem; 
                    box-shadow: 0 0 0 1px #e2e8f0; 
                    border-radius: 8px; 
                }
                .modern-markdown-body th { 
                    background: #f8fafc; 
                    text-align: left; 
                    font-weight: 600; 
                    padding: 8px 12px; 
                    border-bottom: 1px solid #e2e8f0; 
                    color: #334155; 
                    white-space: nowrap; 
                }
                .modern-markdown-body td { 
                    padding: 8px 12px; 
                    border-bottom: 1px solid #f1f5f9; 
                    color: #475569; 
                    white-space: nowrap; 
                }
                .modern-markdown-body tr:last-child td { border-bottom: none; }
                .modern-markdown-body tr:nth-child(even) { background-color: #fdfdfd; }

                .typing-dot {
                    width: 5px;
                    height: 5px;
                    background-color: #94a3b8;
                    border-radius: 50%;
                    display: inline-block;
                    animation: bounceLoaderState 1.4s infinite ease-in-out both;
                }
                @keyframes bounceLoaderState {
                    0%, 80%, 100% { opacity: 0.4; transform: scale(0.8); }
                    40% { opacity: 1; transform: scale(1.2); background-color: #10a37f; }
                }
            `}</style>
        </div>
    );
}

// --- Structural Theme Styling Specs ---
const botContainerWrapper = { display: 'flex', flexDirection: 'column', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', height: 'calc(100vh - 120px)', minHeight: '500px', overflow: 'hidden', boxShadow: '0 8px 30px -4px rgba(0,0,0,0.08)' };
const botHeaderRibbon = { background: '#ffffff', padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' };
const flexAlignRow = { display: 'flex', alignItems: 'center', gap: '10px' };
const botAvatarBadge = { width: '30px', height: '30px', border: '1px solid #e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', overflow: 'hidden' };
const botTitleLabel = { color: '#0f172a', fontSize: '0.9rem', fontWeight: '600' };
const botSubStatus = { color: '#94a3b8', fontSize: '0.7rem', fontWeight: '400' };
const clearMemoryActionBtn = { background: 'transparent', color: '#94a3b8', border: 'none', padding: '6px', cursor: 'pointer', transition: 'color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' };

const chatDialogueDisplayBox = { flex: 1, padding: '24px 16px', overflowY: 'auto', background: '#ffffff' };
const messagesConstraintBox = { width: '100%', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' };

const dialogRowUserTrack = { display: 'flex', justifyContent: 'flex-end', width: '100%' };
const dialogRowBotTrack = { display: 'flex', justifyContent: 'flex-start', width: '100%', gap: '10px' };

const botIconWrapper = { width: '26px', height: '26px', border: '1px solid #e2e8f0', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px', background: '#ffffff', overflow: 'hidden' };
const userDialogueWrapperBubble = { maxWidth: '80%', background: '#f4f4f5', color: '#0f172a', borderRadius: '16px', padding: '10px 16px', fontSize: '0.9rem', lineHeight: '1.5' };
const botDialogueWrapperBubble = { flex: 1, maxWidth: '100%', color: '#0f172a', borderRadius: '0', padding: '0' };

const formInteractionPanelTray = { background: '#ffffff', padding: '10px 16px 16px', display: 'flex', justifyContent: 'center' };
const inputContainerBoxRel = { position: 'relative', display: 'flex', alignItems: 'center', width: '100%', maxWidth: '800px', background: '#f4f4f5', borderRadius: '24px', padding: '6px 6px 6px 14px' };
const inputEntryFieldStyle = { flex: 1, padding: '8px 0', border: 'none', fontSize: '0.95rem', background: 'transparent', outline: 'none', color: '#0f172a' };
const actionDispatchSubmissionBtn = (active) => ({ width: '34px', height: '34px', background: active ? '#000000' : 'transparent', color: active ? '#ffffff' : '#a1a1aa', border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: active ? 'pointer' : 'default', transition: 'all 0.2s', marginLeft: '6px' });

const contentBodyStyle = { fontSize: '0.95rem', lineHeight: '1.6', wordBreak: 'break-word' };
const typingLoaderWrap = { display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 0' };
const dotAnimationDelay = (delay) => ({ animationDelay: `${delay}s` });
