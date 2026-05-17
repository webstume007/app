import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// --- Minimalist Modern SVGs for Chat UI Icons ---
const ICONS = {
    newChat: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
    send: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>, 
    menu: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="14" y2="15"/></svg>,
    trash: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
    // NEW: Chevron Up for Model Selector
    chevronUp: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
};

// Reusable Favicon Component
const IubAvatar = ({ size = 20 }) => (
    <img src="/favicon.ico" alt="IUB Assistant" style={{ width: `${size}px`, height: `${size}px`, borderRadius: '50%', objectFit: 'contain' }} />
);

export default function AIBot({ groqApiKey }) {
    // State Framework (ALL original state preserved)
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState('General');
    const [courseOutlines, setCourseOutlines] = useState([]);
    const [appContextCache, setAppContextCache] = useState({ schedule: [], exceptions: [], transport: [] });
    const [userMeta, setUserMeta] = useState({ session: '', section: '', name: 'Student', semester: '', roll: '' });
    
    // States for Sidebar & Multiple Chats
    const [sessions, setSessions] = useState([]);
    const [currentSessionId, setCurrentSessionId] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // --- NEW: Model Selector States ---
    const [activeModel, setActiveModel] = useState('gpt-oss'); // Defaults to GPT OSS
    const [showModelMenu, setShowModelMenu] = useState(false);

    const messagesEndRef = useRef(null);

    // NEW: Close model menu if clicked outside
    useEffect(() => {
        const handleClickOutside = () => setShowModelMenu(false);
        if (showModelMenu) {
            document.addEventListener('click', handleClickOutside);
        }
        return () => document.removeEventListener('click', handleClickOutside);
    }, [showModelMenu]);

    // Dynamic Semester Calculator based on Session
    const calculateSemester = (sessionStr) => {
        if (!sessionStr) return 'Unknown Semester';
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
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

    const getCurrentTime12Hour = () => {
        return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    // --- Core Lifecycle Optimization (Unchanged Logic) ---
    useEffect(() => {
        const savedSelection = localStorage.getItem('iub_user_selection');
        const savedRoll = localStorage.getItem('iub_my_roll');
        let session = '';
        let section = 'GUEST';
        let userName = 'Student';
        let rollNumber = savedRoll || 'Not Provided';

        if (savedSelection) {
            const parsed = JSON.parse(savedSelection);
            session = parsed.session || parsed.semester || '';
            section = parsed.section || 'GUEST';
            userName = parsed.name || 'Student';
            const calculatedSem = calculateSemester(session);
            setUserMeta(prev => ({ ...prev, session, section, name: userName, semester: calculatedSem, roll: rollNumber }));
        }

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

        // Load Multiple Chat Sessions
        const loadedSessions = JSON.parse(localStorage.getItem(`iub_sessions_${session}_${section}`)) || [];
        setSessions(loadedSessions);

        const key = `iub_chat_history_${session}_${section}`;
        const savedChat = localStorage.getItem(key);
        
        if (savedChat) {
            setMessages(JSON.parse(savedChat));
            setCurrentSessionId(loadedSessions.length > 0 ? loadedSessions[0].id : Date.now().toString());
        } else {
            handleNewChat();
        }

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

    // Save Active Chat & Sync with Sessions
    useEffect(() => {
        if (userMeta.session || userMeta.section) {
            const legacyKey = `iub_chat_history_${userMeta.session}_${userMeta.section}`;
            localStorage.setItem(legacyKey, JSON.stringify(messages));
            
            if (messages.length > 1) {
                setSessions(prev => {
                    const existing = prev.find(s => s.id === currentSessionId);
                    const titleMsg = messages.find(m => m.sender === 'user');
                    const title = titleMsg ? titleMsg.text.substring(0, 22) + '...' : 'New Chat';
                    
                    let updated;
                    if (existing) {
                        updated = prev.map(s => s.id === currentSessionId ? { ...s, messages, title } : s);
                    } else {
                        updated = [{ id: currentSessionId, title, messages }, ...prev];
                    }
                    localStorage.setItem(`iub_sessions_${userMeta.session}_${userMeta.section}`, JSON.stringify(updated));
                    return updated;
                });
            }
        }
        autoScrollToBottom();
    }, [messages, isTyping, currentSessionId]);

    const autoScrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // --- Context Compilation Architecture (Upgraded Instructions) ---
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
1. USER METADATA CONTEXT: The active user is registered in Session: ${userMeta.session || 'N/A'} which makes it their ${userMeta.semester}. Their Section is: ${userMeta.section || 'GUEST'}. User Name: ${userMeta.name}. Roll Number: ${userMeta.roll}. You must structure your conversations acknowledging their specific identity, current ${userMeta.semester}, and section.
2. OFFICIAL COURSE OUTLINES (SUPABASE SOURCE):
${outlineContext || "No custom course outline profiles mapped for this section configuration."}
3. CURRENT ACTIVE SCHEDULE LOGS:
${baseScheduleContext || "No general template schedules loaded."}
4. LIVE TIMETABLE EXCEPTIONS (CANCELLATIONS/RESCHEDULES):
${exceptionsContext || "No dynamic schedule alteration overrides logged for this runtime block."}
5. TRANSPORT TIMINGS (ROUTE LOGS):
${transportContext || "No active operational transit parameters logged."}

CRITICAL RULES OF ENGAGEMENT:
- CONCISENESS IS REQUIRED: If the user says "Hi", "Hello", or gives a basic greeting, ONLY reply with a short, polite greeting (e.g. "Hi ${userMeta.name}, how can I help you today?"). DO NOT output schedule or transport data unless explicitly asked.
- DATA PRESENTATION: When asked about data (transport points, schedule, etc.), DO NOT output the raw database text. Summarize and organize it beautifully into natural conversational language or bullet points.
- ABSOLUTELY NO TABLES: You are STRICTLY FORBIDDEN from using markdown tables in your responses. You MUST format all data, schedules, and information using simple, easy-to-read bullet points.
- TIME FORMAT CONVERSION: You MUST convert any time fetched from the database in 24-hour format into 12-hour format (e.g., convert 14:00 to 2:00 PM) before displaying it to the user.
- Format your output strictly using Markdown (use ### for headings, ** for bold). 
- Maintain a highly sophisticated, adaptive, supportive yet peer-like academic posture. Provide actionable answers concisely without fluff.`;
    };

    // --- Message Processing Dispatch Engine ---
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputValue.trim()) return;

        const studentMessageText = inputValue.trim();
        const timestampString = getCurrentTime12Hour();
        
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
            let aiGeneratedText = "";

            if (activeModel === 'gpt-oss') {
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
                        model: "openai/gpt-oss-20b", // STRICT FIX: Implemented Groq's GPT OSS Model
                        messages: targetPayloadMessages,
                        temperature: 0.3,
                        max_tokens: 1500
                    })
                });

                const responseData = await response.json();
                
                // STRICT FIX: Surfacing the actual Groq API Error Message (e.g., "Invalid API Key") if choices fail to map
                const apiErrorCapture = responseData?.error?.message ? `Groq API Error: ${responseData.error.message}` : null;
                aiGeneratedText = responseData?.choices?.[0]?.message?.content || apiErrorCapture || "I encountered an optimization block processing this prompt request pipeline. Please re-verify data endpoints transmission constraints.";
            } else {
                // --- NEW: GEMINI PRO ROUTING ---
                const systemContextString = buildSystemContextInstruction();
                const geminiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${geminiKey}`;
                
                const geminiHistory = messages.slice(-10).map(m => ({
                    role: m.sender === 'user' ? 'user' : 'model',
                    parts: [{ text: m.text }]
                }));
                geminiHistory.push({ role: 'user', parts: [{ text: studentMessageText }] });

                const response = await fetch(geminiUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        systemInstruction: { parts: [{ text: systemContextString }] },
                        contents: geminiHistory,
                        generationConfig: { temperature: 0.3 }
                    })
                });

                const responseData = await response.json();
                const apiErrorCapture = responseData?.error?.message ? `Gemini API Error: ${responseData.error.message}` : null;
                aiGeneratedText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text || apiErrorCapture || "I encountered an optimization block processing this prompt request pipeline. Please re-verify data endpoints transmission constraints.";
            }

            const newBotMessage = {
                id: `msg-${Date.now()}-bot`,
                sender: 'bot',
                text: aiGeneratedText,
                timestamp: getCurrentTime12Hour()
            };

            setMessages(prev => [...prev, newBotMessage]);

        } catch (error) {
            console.error("AI Thread Engine Error Execution:", error);
            setMessages(prev => [...prev, {
                id: `msg-${Date.now()}-err`,
                sender: 'bot',
                text: "An execution timeout anomaly occurred in the remote network pipeline interface layer. Please check your network connection status parameters.",
                timestamp: getCurrentTime12Hour()
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    // Sidebar & Chat Navigation Controls
    const handleNewChat = () => {
        setMessages([
            {
                id: `welcome-${Date.now()}`,
                sender: 'bot',
                text: `Hi, I am IUB AI Assitant, How Can I help you in Schedule, Course Outline, Points Timing and Your Section's Teachers Info?`,
                timestamp: getCurrentTime12Hour()
            }
        ]);
        setCurrentSessionId(Date.now().toString());
        if (window.innerWidth < 768) setIsSidebarOpen(false);
    };

    const loadSession = (id) => {
        const target = sessions.find(s => s.id === id);
        if (target) {
            setMessages(target.messages);
            setCurrentSessionId(id);
            if (window.innerWidth < 768) setIsSidebarOpen(false);
        }
    };

    const clearChatHistoryStateLog = () => {
        if (window.confirm("Are you sure you want to clear this current chat?")) {
            // FIX: Removes completely from Sidebar state and LocalStorage permanently
            const updatedSessions = sessions.filter(s => s.id !== currentSessionId);
            setSessions(updatedSessions);
            localStorage.setItem(`iub_sessions_${userMeta.session}_${userMeta.section}`, JSON.stringify(updatedSessions));
            localStorage.removeItem(`iub_chat_history_${userMeta.session}_${userMeta.section}`);
            
            handleNewChat();
        }
    };

    const isNewChat = messages.length === 1 && messages[0].sender === 'bot';

    // --- Sub-Component Parser Upgraded for Real Markdown & Safe Tables ---
    const StructuralMessageBlock = ({ text }) => {
        return (
            <div className="modern-markdown-body" style={{...contentBodyStyle, maxWidth: '100%', overflowX: 'auto'}}>
                <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                        // FIX: Injected minWidth 'max-content' so the table triggers the parent overflowX scroll safely
                        table: ({node, ...props}) => (
                            <div style={{ overflowX: 'auto', width: '100%', maxWidth: '100%', margin: '0.75rem 0', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                                <table {...props} style={{ width: '100%', minWidth: 'max-content', borderCollapse: 'collapse', margin: 0, fontSize: '0.8rem' }} />
                            </div>
                        ),
                        th: ({node, ...props}) => <th {...props} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '600', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#334155', whiteSpace: 'nowrap' }} />,
                        td: ({node, ...props}) => <td {...props} style={{ padding: '8px 12px', borderBottom: '1px solid #f1f5f9', color: '#475569', whiteSpace: 'nowrap' }} />
                    }}
                >
                    {text}
                </ReactMarkdown>
            </div>
        );
    };

    return (
        <div style={{ backgroundColor: '#f8fafc', display: 'flex', justifyContent: 'center', height: '100%' }}>
            <div className="ai-chat-wrapper" style={botContainerWrapper}>
                
                {/* Minimal Header Ribbon Section */}
                <div style={botHeaderRibbon}>
                    <div style={flexAlignRow}>
                        {!isNewChat && <div style={botAvatarBadge}><IubAvatar size={18} /></div>}
                        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <div style={botTitleLabel}>IUB Assistant AI</div>
                            <div style={botSubStatus}>
                                {userMeta.semester || userMeta.session || 'Session'} • {userMeta.section || 'Section'}
                            </div>
                        </div>
                    </div>
                    <div style={flexAlignRow}>
                        <button onClick={clearChatHistoryStateLog} style={clearMemoryActionBtn} title="Clear Chat">
                            {ICONS.trash}
                        </button>
                        <button onClick={handleNewChat} style={clearMemoryActionBtn} title="New Chat">
                            {ICONS.newChat}
                        </button>
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={clearMemoryActionBtn} title="Previous Chats">
                            {ICONS.menu}
                        </button>
                    </div>
                </div>

                {/* Main Content Area (Sidebar + Chat) */}
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
                    
                    {/* Interactive Chat Canvas */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <div style={chatDialogueDisplayBox}>
                            {isNewChat ? (
                                <div style={heroEntranceCenter}>
                                    {/* FIX: Animated Logo Glow Wrapper Appended */}
                                    <div className="logo-glow-wrapper">
                                        <div style={heroLogoWrap}><IubAvatar size={42} /></div>
                                    </div>
                                    <h2 style={heroTitle}>IUB AI Assistant</h2>
                                    <p style={heroSubtitle}>{messages[0]?.text}</p>
                                </div>
                            ) : (
                                <div style={messagesConstraintBox}>
                                    {messages.map((msg) => {
                                        const isUserMessage = msg.sender === 'user';
                                        return (
                                            <div key={msg.id} style={isUserMessage ? dialogRowUserTrack : dialogRowBotTrack}>
                                                <div style={isUserMessage ? userDialogueWrapperBubble : botDialogueWrapperBubble}>
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
                                    <div ref={messagesEndRef} style={{ height: '1px' }} />
                                </div>
                            )}
                        </div>

                        {/* Ultra Minimal Neon-AI Input Form */}
                        <form onSubmit={handleSendMessage} style={formInteractionPanelTray}>
                            <div className="animated-neon-border">
                                <div style={inputContainerBoxRel}>
                                    <input 
                                        type="text"
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        placeholder="Message IUB AI..."
                                        style={{...inputEntryFieldStyle, paddingRight: '96px'}} // OVERRIDE applied here inline to prevent touching your style consts
                                        disabled={isTyping}
                                    />

                                    {/* --- NEW MODEL SELECTOR --- */}
                                    <div style={{ position: 'absolute', right: '46px', top: '50%', transform: 'translateY(-50%)' }}>
                                        {/* FIX: Added e.stopPropagation() to prevent document level click from instantly closing menu */}
                                        <button 
                                            type="button" 
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowModelMenu(!showModelMenu); }}
                                            style={modelDropdownBtnStyle}
                                            title="Select AI Model"
                                        >
                                            <span style={{ fontSize: '11px', fontWeight: '700', marginRight: '4px' }}>
                                                {activeModel === 'gpt-oss' ? 'GPT' : 'GEM'}
                                            </span>
                                            {ICONS.chevronUp}
                                        </button>

                                        {showModelMenu && (
                                            <div style={modelMenuPopupStyle}>
                                                <div 
                                                    style={modelMenuItem(activeModel === 'gpt-oss')} 
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveModel('gpt-oss'); setShowModelMenu(false); }}
                                                >
                                                    <div style={{ fontSize: '13px', fontWeight: '600' }}>GPT OSS</div>
                                                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>Groq Engine (Fast)</div>
                                                </div>
                                                <div 
                                                    style={modelMenuItem(activeModel === 'gemini-pro')} 
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveModel('gemini-pro'); setShowModelMenu(false); }}
                                                >
                                                    <div style={{ fontSize: '13px', fontWeight: '600' }}>Gemini 1.5 Pro</div>
                                                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>Google AI (Smart)</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Send button positioned perfectly inside text bar */}
                                    <button type="submit" style={actionDispatchSubmissionBtn(inputValue.trim())} disabled={!inputValue.trim()}>
                                        {ICONS.send}
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>

                    {/* Sidebar Panel overlay on Mobile, inline on Desktop */}
                    {isSidebarOpen && (
                        <div className="sidebar-container sidebar-slide-in">
                            <h3 style={sidebarTitle}>Previous Chats</h3>
                            {sessions.length === 0 ? (
                                <p style={sidebarEmpty}>No previous chats yet.</p>
                            ) : (
                                sessions.map(session => (
                                    <div 
                                        key={session.id} 
                                        onClick={() => loadSession(session.id)}
                                        style={sidebarItem(currentSessionId === session.id)}
                                    >
                                        {session.title}
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                <style>{`
                    .ai-chat-wrapper {
                        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                        animation: slideUpFade 0.3s ease-out forwards;
                    }
                    
                    @keyframes slideUpFade {
                        0% { opacity: 0; transform: translateY(10px); }
                        100% { opacity: 1; transform: translateY(0); }
                    }

                    /* FIX: Animated Neon Gradient Border + Glow Adjustments */
                    .animated-neon-border {
                        position: relative;
                        padding: 2px; /* Increased border width slightly */
                        border-radius: 20px; /* Slight decrease roundness */
                        background: linear-gradient(90deg, #38bdf8, #818cf8, #c084fc, #38bdf8);
                        background-size: 300% 100%;
                        animation: aiGlow 4s linear infinite;
                        width: 100%;
                        max-width: 700px;
                        margin: 0 auto;
                        z-index: 1;
                    }
                    .animated-neon-border::before {
                        content: "";
                        position: absolute;
                        top: 0; left: 0; right: 0; bottom: 0;
                        border-radius: 20px;
                        background: linear-gradient(90deg, #38bdf8, #818cf8, #c084fc, #38bdf8);
                        background-size: 300% 100%;
                        animation: aiGlow 4s linear infinite;
                        filter: blur(12px); /* Adding Google-like moving shadow */
                        opacity: 0.5;
                        z-index: -1;
                    }
                    
                    /* FIX: Re-using the exact gradient glow for the Logo Wrapper */
                    .logo-glow-wrapper {
                        position: relative;
                        width: 64px; height: 64px;
                        border-radius: 50%;
                        margin-bottom: 16px;
                        background: linear-gradient(90deg, #38bdf8, #818cf8, #c084fc, #38bdf8);
                        background-size: 300% 100%;
                        animation: aiGlow 4s linear infinite;
                        padding: 2px;
                        z-index: 1;
                    }
                    .logo-glow-wrapper::before {
                        content: "";
                        position: absolute;
                        top: 0; left: 0; right: 0; bottom: 0;
                        border-radius: 50%;
                        background: linear-gradient(90deg, #38bdf8, #818cf8, #c084fc, #38bdf8);
                        background-size: 300% 100%;
                        animation: aiGlow 4s linear infinite;
                        filter: blur(12px);
                        opacity: 0.5;
                        z-index: -1;
                    }

                    @keyframes aiGlow {
                        0% { background-position: 100% 0; }
                        100% { background-position: 0 0; }
                    }

                    /* Sidebar Responsive Styling */
                    .sidebar-container {
                        width: 260px;
                        background: #f8fafc;
                        border-left: 1px solid #e2e8f0;
                        padding: 16px;
                        overflow-y: auto;
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                    }
                    .sidebar-slide-in {
                        animation: slideLeft 0.2s ease-out forwards;
                    }
                    @keyframes slideLeft {
                        0% { opacity: 0; transform: translateX(20px); }
                        100% { opacity: 1; transform: translateX(0); }
                    }
                    
                    /* Mobile Sidebar specifically taking 85% width */
                    @media (max-width: 768px) {
                        .sidebar-container {
                            position: absolute;
                            right: 0;
                            top: 0;
                            height: 100%;
                            width: 85%;
                            z-index: 50;
                            box-shadow: -4px 0 20px rgba(0,0,0,0.1);
                        }
                    }

                    /* Markdown Overrides */
                    .modern-markdown-body p { margin-top: 0; margin-bottom: 0.75rem; }
                    .modern-markdown-body p:first-child { margin-top: 0; }
                    .modern-markdown-body p:last-child { margin-bottom: 0; }
                    .modern-markdown-body h1, .modern-markdown-body h2, .modern-markdown-body h3 { font-weight: 600; color: #111827; margin-top: 0.75rem; margin-bottom: 0.5rem; }
                    .modern-markdown-body h3 { font-size: 0.95rem; }
                    .modern-markdown-body ul, .modern-markdown-body ol { margin-top: 0; margin-bottom: 0.75rem; padding-left: 1.5rem; }
                    .modern-markdown-body li { margin-bottom: 0.2rem; }
                    .modern-markdown-body strong { font-weight: 600; color: #111827; }
                    .modern-markdown-body code { font-family: ui-monospace, monospace; background: #f8fafc; padding: 0.1rem 0.3rem; border-radius: 4px; font-size: 0.85em; color: #cf222e; }
                    .modern-markdown-body pre code { display: block; padding: 0.85rem; overflow-x: auto; background: #f8fafc; color: #24292f; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 0.8rem; line-height: 1.4; }
                    
                    .typing-dot {
                        width: 4px;
                        height: 4px;
                        background-color: #94a3b8;
                        border-radius: 50%;
                        display: inline-block;
                        animation: bounceLoaderState 1.4s infinite ease-in-out both;
                    }
                    @keyframes bounceLoaderState {
                        0%, 80%, 100% { opacity: 0.4; transform: scale(0.8); }
                        40% { opacity: 1; transform: scale(1.2); background-color: #0ea5e9; }
                    }
                `}</style>
            </div>
        </div>
    );
}

// --- Structural Theme Styling Specs ---
const botContainerWrapper = { display: 'flex', flexDirection: 'column', background: '#ffffff', width: '100%', maxWidth: '1000px', margin: '0 auto', height: 'calc(100vh - 80px)', minHeight: '500px', boxShadow: '0 0 20px rgba(0,0,0,0.03)', boxSizing: 'border-box' };
const botHeaderRibbon = { background: '#ffffff', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f8fafc', zIndex: 10, boxSizing: 'border-box' };
const flexAlignRow = { display: 'flex', alignItems: 'center', gap: '8px' };
const botAvatarBadge = { width: '28px', height: '28px', border: '1px solid #f1f5f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#ffffff', overflow: 'hidden' };
const botTitleLabel = { color: '#0f172a', fontSize: '0.85rem', fontWeight: '600', letterSpacing: '-0.2px' };
const botSubStatus = { color: '#94a3b8', fontSize: '0.65rem', fontWeight: '400' };
const clearMemoryActionBtn = { background: 'transparent', color: '#64748b', border: 'none', padding: '6px', cursor: 'pointer', transition: 'color 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' };

const chatDialogueDisplayBox = { flex: 1, padding: '20px 20px', overflowY: 'auto', background: '#ffffff', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' };

// Center Entrance Styles
const heroEntranceCenter = { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingBottom: '10vh' };
// FIX: Margin and shadows mapped out to Logo Glow wrapper. Native logo wrap just centers.
const heroLogoWrap = { width: '100%', height: '100%', borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' };
const heroTitle = { fontSize: '1.25rem', fontWeight: '600', color: '#0f172a', margin: '0 0 8px 0', letterSpacing: '-0.4px' };
const heroSubtitle = { fontSize: '0.85rem', color: '#64748b', textAlign: 'center', maxWidth: '300px', lineHeight: '1.5' };

const messagesConstraintBox = { width: '100%', maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 };

const dialogRowUserTrack = { display: 'flex', justifyContent: 'flex-end', width: '100%' };
const dialogRowBotTrack = { display: 'flex', justifyContent: 'flex-start', width: '100%', gap: '10px', minWidth: 0 };

const userDialogueWrapperBubble = { maxWidth: '85%', background: '#f8fafc', color: '#0f172a', borderRadius: '12px', padding: '10px 12px', fontSize: '0.85rem', lineHeight: '1.5', border: '1px solid #f1f5f9', boxSizing: 'border-box' };
const botDialogueWrapperBubble = { flex: 1, maxWidth: '100%', minWidth: 0, color: '#0f172a', borderRadius: '0', padding: '0' };

const formInteractionPanelTray = { background: '#ffffff', padding: '10px 20px 16px', display: 'flex', justifyContent: 'center', position: 'sticky', bottom: 0, zIndex: 10, boxSizing: 'border-box' };
// FIX: Applied 20px Border Radius
const inputContainerBoxRel = { position: 'relative', display: 'flex', alignItems: 'center', width: '100%', background: '#ffffff', borderRadius: '20px', boxSizing: 'border-box' };
const inputEntryFieldStyle = { flex: 1, padding: '12px 48px 12px 16px', border: 'none', borderRadius: '20px', fontSize: '0.95rem', background: 'transparent', outline: 'none', color: '#0f172a' };
const actionDispatchSubmissionBtn = (active) => ({ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', width: '32px', height: '32px', background: active ? '#0ea5e9' : '#f1f5f9', color: active ? '#ffffff' : '#94a3b8', border: 'none', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: active ? 'pointer' : 'default', transition: 'all 0.2s' });

// --- NEW STYLES FOR DROPDOWN (UPGRADED BEAUTIFUL UI) ---
const modelDropdownBtnStyle = { background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '16px', height: '26px', padding: '0 8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s', zIndex: 11 };
const modelMenuPopupStyle = { position: 'absolute', bottom: 'calc(100% + 12px)', right: '-10px', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(8px)', borderRadius: '14px', padding: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.15)', border: '1px solid #e2e8f0', minWidth: '160px', zIndex: 999, display: 'flex', flexDirection: 'column', gap: '4px' };
const modelMenuItem = (isActive) => ({ padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s', background: isActive ? '#f0f9ff' : 'transparent', border: isActive ? '1px solid #bae6fd' : '1px solid transparent' });

const contentBodyStyle = { fontSize: '0.9rem', lineHeight: '1.6', wordBreak: 'break-word' };
const typingLoaderWrap = { display: 'flex', alignItems: 'center', gap: '3px', padding: '4px 0' };
const dotAnimationDelay = (delay) => ({ animationDelay: `${delay}s` });

// Sidebar Styling
const sidebarTitle = { fontSize: '0.8rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', marginTop: '0' };
const sidebarEmpty = { fontSize: '0.8rem', color: '#94a3b8' };
const sidebarItem = (isActive) => ({ padding: '10px 12px', fontSize: '0.85rem', color: isActive ? '#0ea5e9' : '#334155', background: isActive ? '#e0f2fe' : 'transparent', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.2s', border: '1px solid', borderColor: isActive ? '#bae6fd' : 'transparent', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' });
