<>
  <meta charSet="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Curriculum Mind Map &amp; Learning Planner</title>
  {/* Tailwind CSS */}
  {/* Google Fonts */}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
  <link
    href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap"
    rel="stylesheet"
  />
  {/* Lucide Icons */}
  {/* MathJax for rendering LaTeX notations inside the canvas */}
  <style
    dangerouslySetInnerHTML={{
      __html:
        "\n    body {\n      font-family: 'Plus Jakarta Sans', sans-serif;\n    }\n    .mono {\n      font-family: 'JetBrains Mono', monospace;\n    }\n    .glass {\n      background: rgba(15, 23, 42, 0.6);\n      backdrop-filter: blur(12px);\n      -webkit-backdrop-filter: blur(12px);\n      border: 1px rgba(255, 255, 255, 0.08) solid;\n    }\n    .custom-scrollbar::-webkit-scrollbar {\n      width: 6px;\n      height: 6px;\n    }\n    .custom-scrollbar::-webkit-scrollbar-track {\n      background: rgba(15, 23, 42, 0.3);\n    }\n    .custom-scrollbar::-webkit-scrollbar-thumb {\n      background: rgba(99, 102, 241, 0.4);\n      border-radius: 4px;\n    }\n    .custom-scrollbar::-webkit-scrollbar-thumb:hover {\n      background: rgba(99, 102, 241, 0.7);\n    }\n  "
    }}
  />
  {/* Header Section */}
  <header className="relative overflow-hidden border-b border-slate-900 bg-slate-950 py-12 px-6">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.08),transparent_50%)]" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.06),transparent_50%)]" />
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <span className="px-2.5 py-1 text-xs font-semibold tracking-wider text-indigo-400 bg-indigo-950/50 border border-indigo-900/50 rounded-full uppercase">
            AI Engineering Pathway
          </span>
          <span className="text-slate-500 text-sm flex items-center gap-1">
            <i data-lucide="clock" className="w-4 h-4" /> High Intensity Study
            Track
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
          The Decoupled Curriculum Mind Map
        </h1>
        <p className="text-slate-400 mt-2 text-base max-w-2xl">
          An interactive, grouped mapping of your 4-year degree. Filter out
          general education, balance technical tracks, and simulate your
          self-learning pace.
        </p>
      </div>
      {/* Quick Metrics */}
      <div className="grid grid-cols-3 gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 w-full md:w-auto">
        <div className="text-center px-2">
          <div
            className="text-2xl font-bold text-indigo-400 mono"
            id="total-subjects"
          >
            47
          </div>
          <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">
            Total Subjects
          </div>
        </div>
        <div className="text-center px-2 border-x border-slate-800">
          <div
            className="text-2xl font-bold text-emerald-400 mono"
            id="total-tech-subjects"
          >
            32
          </div>
          <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">
            Tech Core
          </div>
        </div>
        <div className="text-center px-2">
          <div
            className="text-2xl font-bold text-amber-400 mono"
            id="total-credits"
          >
            142
          </div>
          <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">
            Est. Credits
          </div>
        </div>
      </div>
    </div>
  </header>
  {/* Main Canvas Layout */}
  <main className="max-w-7xl mx-auto px-6 mt-8">
    {/* Interactive Interactive Controller Box */}
    <section className="glass rounded-2xl p-6 mb-8 border border-slate-800">
      <h2 className="text-lg font-bold flex items-center gap-2 text-indigo-300">
        <i data-lucide="sliders" className="w-5 h-5" /> Self-Paced Time
        Simulator
      </h2>
      <p className="text-slate-400 text-sm mt-1 mb-6">
        Set your commitment level below to dynamically estimate the duration
        needed to master each visual layer.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Input range */}
        <div className="md:col-span-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400 font-medium">Daily Commitment</span>
            <span className="text-indigo-400 font-bold mono" id="hours-display">
              6 Hours / Day
            </span>
          </div>
          <input
            type="range"
            id="hours-slider"
            min={2}
            max={10}
            defaultValue={6}
            step="0.5"
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>2 hrs (Casual)</span>
            <span>6 hrs (Your Target)</span>
            <span>10 hrs (Extreme)</span>
          </div>
        </div>
        <div className="md:col-span-3 space-y-3 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400 font-medium">Days per Week</span>
            <span className="text-indigo-400 font-bold mono" id="days-display">
              5 Days / Week
            </span>
          </div>
          <input
            type="range"
            id="days-slider"
            min={3}
            max={7}
            defaultValue={5}
            step={1}
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>3 Days</span>
            <span>5 Days</span>
            <span>7 Days</span>
          </div>
        </div>
        {/* Calculated Outcome Output box */}
        <div className="md:col-span-4 bg-indigo-950/20 rounded-xl border border-indigo-900/50 p-4 text-center md:text-left flex flex-col justify-between h-full min-h-[90px]">
          <div className="text-xs text-slate-400 uppercase tracking-widest font-semibold">
            Total Targeted Tech Pathway Learning Time
          </div>
          <div className="mt-2 flex items-baseline justify-center md:justify-start gap-2">
            <span
              className="text-3xl font-extrabold text-indigo-300 tracking-tight"
              id="estimated-total-time"
            >
              ~12.5 Months
            </span>
            <span className="text-xs text-slate-500" id="raw-hours-calc">
              (1,560 total study hours)
            </span>
          </div>
        </div>
      </div>
      {/* Quick Toggle Filter Buttons */}
      <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t border-slate-900">
        <span className="text-slate-400 text-sm font-semibold mr-2 flex items-center">
          Filter View:
        </span>
        <button
          onclick="filterLayers('all')"
          id="btn-all"
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white transition-all shadow-md"
        >
          Show All Layers
        </button>
        <button
          onclick="filterLayers('tech')"
          id="btn-tech"
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-slate-400 border border-slate-800 hover:text-white transition-all"
        >
          Pure Engineering Core (Layers 1-5)
        </button>
        <button
          onclick="filterLayers('gen')"
          id="btn-gen"
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-slate-400 border border-slate-800 hover:text-white transition-all"
        >
          Humanities &amp; Breadth (Layer 6)
        </button>
      </div>
    </section>
    {/* Visual Grid Columns representing the Layers */}
    <div
      className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
      id="layers-container"
    >
      {/* LAYER 1 */}
      <div
        className="glass rounded-2xl p-6 border border-slate-800 flex flex-col justify-between layer-card"
        data-category="tech"
      >
        <div>
          <div className="flex justify-between items-start mb-4">
            <span className="text-indigo-400 text-xs font-bold tracking-widest uppercase mono">
              Layer 1
            </span>
            <span
              className="bg-indigo-950/80 border border-indigo-900 text-indigo-300 text-[10px] px-2.5 py-0.5 rounded-full mono font-semibold tracking-wide duration-est"
              data-base-hours={240}
            >
              Est: -- Weeks
            </span>
          </div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="p-1.5 bg-indigo-900/40 text-indigo-400 rounded-lg">
              <i data-lucide="binary" className="w-5 h-5" />
            </span>
            The Engine (Math &amp; Science)
          </h3>
          <p className="text-slate-400 text-sm mt-3 leading-relaxed">
            The mathematical models, coordinate spaces, vector dimensions, and
            systems optimization logic that power neural calculations and 3D
            space engines.
          </p>
          <div className="mt-6 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Matches &amp; Included Subjects
            </h4>
            <div className="space-y-2.5">
              {/* Subject 1 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Linear Algebra')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Linear Algebra
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 3
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  Understanding high-dimensional spaces, eigenvectors, and
                  transformations.
                </div>
              </div>
              {/* Subject 2 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Calculus & Analytical Geometry')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Calculus &amp; Geometry
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 1
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  Derivatives, integrals, functions, coordinates and graph
                  plotting basics.
                </div>
              </div>
              {/* Subject 3 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Multivariable Calculus')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Multivariable Calculus
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 2
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  Gradients, partial derivatives, and multi-dimensional
                  optimization spaces.
                </div>
              </div>
              {/* Subject 4 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Probability & Statistics')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Probability &amp; Statistics
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 4
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  Bayes theorem, distributions, expectations, variance, and
                  hypothesis tests.
                </div>
              </div>
              {/* Subject 5 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Applied Physics')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Applied Physics
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 1
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  Circuit foundations, waves, electromagnetism, and sensory
                  systems hardware.
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-900">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 uppercase tracking-widest font-semibold">
              Pre-requisite for:
            </span>
            <span className="text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 px-2.5 py-0.5 rounded-full font-bold">
              Layer 4 (AI / ML)
            </span>
          </div>
        </div>
      </div>
      {/* LAYER 2 */}
      <div
        className="glass rounded-2xl p-6 border border-slate-800 flex flex-col justify-between layer-card"
        data-category="tech"
      >
        <div>
          <div className="flex justify-between items-start mb-4">
            <span className="text-indigo-400 text-xs font-bold tracking-widest uppercase mono">
              Layer 2
            </span>
            <span
              className="bg-indigo-950/80 border border-indigo-900 text-indigo-300 text-[10px] px-2.5 py-0.5 rounded-full mono font-semibold tracking-wide duration-est"
              data-base-hours={360}
            >
              Est: -- Weeks
            </span>
          </div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="p-1.5 bg-indigo-900/40 text-indigo-400 rounded-lg">
              <i data-lucide="terminal" className="w-5 h-5" />
            </span>
            The Toolbelt (Core Software)
          </h3>
          <p className="text-slate-400 text-sm mt-3 leading-relaxed">
            Writing flexible, logic-driven scripts, understanding class
            interfaces, organizing structured data elements in cache memory, and
            optimizing loops.
          </p>
          <div className="mt-6 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Matches &amp; Included Subjects
            </h4>
            <div className="space-y-2.5">
              {/* Subject 1 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Programming Fundamentals')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Programming Fundamentals
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 1
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  Variables, conditions, iterations, recursion, functions, and
                  memory addresses.
                </div>
              </div>
              {/* Subject 2 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Object Oriented Programming')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Object Oriented (OOP)
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 2
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  Classes, polymorphism, inheritance, design patterns,
                  encapsulation.
                </div>
              </div>
              {/* Subject 3 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Data Structures')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Data Structures
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 3
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  Linked Lists, Trees, Heaps, Graphs, Hashing, and structural
                  memory layouts.
                </div>
              </div>
              {/* Subject 4 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Analysis of Algorithms')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Analysis of Algorithms
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 6
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  Big-O analysis, sorting algorithms, greedy strategies, and
                  dynamic programming.
                </div>
              </div>
              {/* Subject 5 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Mobile Application Development')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Mobile App Dev
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 4
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  Event loops, rendering logic, mobile sensory integrations,
                  native SDKs.
                </div>
              </div>
              {/* Subject 6 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Domain Elective 3 (Web Programming)')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Web Programming
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 5
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  RESTful APIs, routing, HTTP frameworks, DOM rendering, and
                  script execution.
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-900">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 uppercase tracking-widest font-semibold">
              Pre-requisite for:
            </span>
            <span className="text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 px-2.5 py-0.5 rounded-full font-bold">
              All Tracks (Core Tool)
            </span>
          </div>
        </div>
      </div>
      {/* LAYER 3 */}
      <div
        className="glass rounded-2xl p-6 border border-slate-800 flex flex-col justify-between layer-card"
        data-category="tech"
      >
        <div>
          <div className="flex justify-between items-start mb-4">
            <span className="text-indigo-400 text-xs font-bold tracking-widest uppercase mono">
              Layer 3
            </span>
            <span
              className="bg-indigo-950/80 border border-indigo-900 text-indigo-300 text-[10px] px-2.5 py-0.5 rounded-full mono font-semibold tracking-wide duration-est"
              data-base-hours={330}
            >
              Est: -- Weeks
            </span>
          </div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="p-1.5 bg-indigo-900/40 text-indigo-400 rounded-lg">
              <i data-lucide="cpu" className="w-5 h-5" />
            </span>
            The Architecture (Hardware &amp; Systems)
          </h3>
          <p className="text-slate-400 text-sm mt-3 leading-relaxed">
            The translation of code into machine logic, CPU thread pipelines,
            network protocols, indexing systems, and low-level computer hardware
            interactions.
          </p>
          <div className="mt-6 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Matches &amp; Included Subjects
            </h4>
            <div className="space-y-2.5">
              {/* Subject 1 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Digital Logic Design')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Digital Logic Design
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 3
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  Logic gates, flip-flops, multiplexers, and hardware-based
                  state machines.
                </div>
              </div>
              {/* Subject 2 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Computer Organization & Assembly Language')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Computer Org &amp; Assembly
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 4
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  Instruction set architectures, CPU registers, stack pointers,
                  microprocessors.
                </div>
              </div>
              {/* Subject 3 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Operating Systems')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Operating Systems
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 5
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  Context switching, thread scheduling, paging, disk storage,
                  memory bounds.
                </div>
              </div>
              {/* Subject 4 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Computer Networks')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Computer Networks
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 4
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  TCP/IP stacks, sockets programming, routing table logic,
                  packets payload.
                </div>
              </div>
              {/* Subject 5 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Database Systems')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Database Systems
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 2
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  Relational algebra, SQL, B-Trees index optimization, ACID
                  guarantees.
                </div>
              </div>
              {/* Subject 6 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Application of ICT')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Application of ICT
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 1
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  Basic computing modules, office workflows, terminal usage,
                  file structures.
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-900">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 uppercase tracking-widest font-semibold">
              Pre-requisite for:
            </span>
            <span className="text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 px-2.5 py-0.5 rounded-full font-bold">
              Layer 5 (Security &amp; Scale)
            </span>
          </div>
        </div>
      </div>
      {/* LAYER 4 */}
      <div
        className="glass rounded-2xl p-6 border border-slate-800 flex flex-col justify-between layer-card"
        data-category="tech"
      >
        <div>
          <div className="flex justify-between items-start mb-4">
            <span className="text-indigo-400 text-xs font-bold tracking-widest uppercase mono">
              Layer 4
            </span>
            <span
              className="bg-indigo-950/80 border border-indigo-900 text-indigo-300 text-[10px] px-2.5 py-0.5 rounded-full mono font-semibold tracking-wide duration-est"
              data-base-hours={480}
            >
              Est: -- Weeks
            </span>
          </div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="p-1.5 bg-indigo-900/40 text-indigo-400 rounded-lg">
              <i data-lucide="brain-circuit" className="w-5 h-5" />
            </span>
            The Brain (Artificial Intelligence Core)
          </h3>
          <p className="text-slate-400 text-sm mt-3 leading-relaxed">
            The core machine systems. Translating patterns into models, teaching
            software to learn from historical data, run optimization networks,
            and interpret images or natural speech.
          </p>
          <div className="mt-6 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Matches &amp; Included Subjects
            </h4>
            <div className="space-y-2.5">
              {/* Subject 1 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Artificial Intelligence')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Artificial Intelligence
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 2
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  Heuristic searches, minimax games, Prolog logic rules, state
                  space models.
                </div>
              </div>
              {/* Subject 2 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Programming for Artificial Intelligence')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    AI Programming (Python)
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 3
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  NumPy arrays, Pandas data manipulation, scikit-learn training
                  utilities.
                </div>
              </div>
              {/* Subject 3 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Machine Learning')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Machine Learning
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 4
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  Regressions, SVMs, Decision Trees, clustering, backpropagation
                  maths.
                </div>
              </div>
              {/* Subject 4 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Artificial Neural Networks')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Neural Networks (Deep Learning)
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 5
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  Perceptrons, Deep MLPs, optimizers (Adam), activation
                  functions.
                </div>
              </div>
              {/* Subject 5 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Computer Vision')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Computer Vision
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 6
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  CNNs, kernels, image processing, object detection, spatial
                  models.
                </div>
              </div>
              {/* Subject 6 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Domain Elective 4 (Natural Language Processing)')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Natural Language (NLP)
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 6
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  Tokenization, embeddings, RNNs, Attention mechanisms, and
                  Transformers.
                </div>
              </div>
              {/* Subject 7 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Domain Elective 5 (Data Mining)')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Data Mining
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 6/7
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  Feature extraction, association mining, database querying
                  optimizations.
                </div>
              </div>
              {/* Subject 8 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Knowledge Representation & Reasoning')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Knowledge Rep &amp; Reasoning
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 5
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  Ontologies, knowledge graphs, description logics, symbolic
                  engine.
                </div>
              </div>
              {/* Subject 9 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Domain Elective 2 (Robotics)')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Robotics / Autonomous Systems
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 5
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  Actuators, sensor integrations, kinematics, inverse kinematics
                  math.
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-900">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 uppercase tracking-widest font-semibold">
              Enabled by:
            </span>
            <span className="text-indigo-400 font-bold bg-indigo-950/40 border border-indigo-900/60 px-2.5 py-0.5 rounded-full">
              Layers 1 &amp; 2
            </span>
          </div>
        </div>
      </div>
      {/* LAYER 5 */}
      <div
        className="glass rounded-2xl p-6 border border-slate-800 flex flex-col justify-between layer-card"
        data-category="tech"
      >
        <div>
          <div className="flex justify-between items-start mb-4">
            <span className="text-indigo-400 text-xs font-bold tracking-widest uppercase mono">
              Layer 5
            </span>
            <span
              className="bg-indigo-950/80 border border-indigo-900 text-indigo-300 text-[10px] px-2.5 py-0.5 rounded-full mono font-semibold tracking-wide duration-est"
              data-base-hours={240}
            >
              Est: -- Weeks
            </span>
          </div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="p-1.5 bg-indigo-900/40 text-indigo-400 rounded-lg">
              <i data-lucide="shield-check" className="w-5 h-5" />
            </span>
            The Guardrails (Engineering, Security &amp; Scale)
          </h3>
          <p className="text-slate-400 text-sm mt-3 leading-relaxed">
            Structuring secure systems, planning robust software layouts,
            deploying models across cluster networks, and communicating with
            technical stakeholders.
          </p>
          <div className="mt-6 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Matches &amp; Included Subjects
            </h4>
            <div className="space-y-2.5">
              {/* Subject 1 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Software Engineering')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Software Engineering
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono font-semibold">
                    Sem 3 &amp; 8
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  SDLC models, architecture designs, testing mechanisms, Agile
                  processes.
                </div>
              </div>
              {/* Subject 2 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Parallel & Distributed Computing')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Parallel &amp; Distributed
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 7
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  Multi-threading, MapReduce frameworks, cluster tasks
                  synchronization.
                </div>
              </div>
              {/* Subject 3 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Information Security')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Information Security
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 7
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  Cryptographic hashes, public-private key structures, security
                  policies.
                </div>
              </div>
              {/* Subject 4 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Professional Practices')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Professional Practices
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 8
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  Engineering ethics, licensing regimes, corporate compliance
                  frameworks.
                </div>
              </div>
              {/* Subject 5 */}
              <div
                className="bg-slate-900/50 hover:bg-slate-900 p-3 rounded-xl border border-slate-800/80 transition-all cursor-pointer group"
                onclick="showSubjectDetail('Entrepreneurship')"
              >
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-200 group-hover:text-indigo-300 transition-colors">
                    Entrepreneurship
                  </span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded mono">
                    Sem 6
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 italic">
                  Validating products, venture capital paths, and building
                  scalable tech.
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-900">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 uppercase tracking-widest font-semibold">
              Industry Ready:
            </span>
            <span className="text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-900/60 px-2.5 py-0.5 rounded-full">
              DevOps &amp; Production
            </span>
          </div>
        </div>
      </div>
      {/* LAYER 6 */}
      <div
        className="glass rounded-2xl p-6 border border-slate-800 flex flex-col justify-between layer-card"
        data-category="gen"
      >
        <div>
          <div className="flex justify-between items-start mb-4">
            <span className="text-indigo-400 text-xs font-bold tracking-widest uppercase mono">
              Layer 6
            </span>
            <span className="bg-slate-900 border border-slate-800 text-slate-400 text-[10px] px-2.5 py-0.5 rounded-full mono font-semibold tracking-wide">
              Semesters 1-8 (Breadth)
            </span>
          </div>
          <h3 className="text-xl font-bold text-slate-300 flex items-center gap-2">
            <span className="p-1.5 bg-slate-900 text-slate-500 rounded-lg">
              <i data-lucide="book-open" className="w-5 h-5" />
            </span>
            The Context (Humanties &amp; Social Sciences)
          </h3>
          <p className="text-slate-400 text-sm mt-3 leading-relaxed">
            Social sciences, national history, language arts, theology, and
            legal systems. Essential for writing thesis papers, business
            proposals, and matching academic standards.
          </p>
          <div className="mt-6 space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Included Breadth Modules
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-900/30 p-2 rounded-lg border border-slate-800/50">
                <span className="font-bold text-slate-300 block">
                  Functional English
                </span>
                <span className="text-slate-500 italic mt-0.5 block">
                  Sem 1
                </span>
              </div>
              <div className="bg-slate-900/30 p-2 rounded-lg border border-slate-800/50">
                <span className="font-bold text-slate-300 block">
                  Islamic Studies/Ethics
                </span>
                <span className="text-slate-500 italic mt-0.5 block">
                  Sem 1
                </span>
              </div>
              <div className="bg-slate-900/30 p-2 rounded-lg border border-slate-800/50">
                <span className="font-bold text-slate-300 block">
                  Pak Studies
                </span>
                <span className="text-slate-500 italic mt-0.5 block">
                  Sem 3 &amp; 6
                </span>
              </div>
              <div className="bg-slate-900/30 p-2 rounded-lg border border-slate-800/50">
                <span className="font-bold text-slate-300 block">
                  Ideology &amp; Const.
                </span>
                <span className="text-slate-500 italic mt-0.5 block">
                  Sem 2
                </span>
              </div>
              <div className="bg-slate-900/30 p-2 rounded-lg border border-slate-800/50">
                <span className="font-bold text-slate-300 block">
                  Arabic for Quran
                </span>
                <span className="text-slate-500 italic mt-0.5 block">
                  Sem 3
                </span>
              </div>
              <div className="bg-slate-900/30 p-2 rounded-lg border border-slate-800/50">
                <span className="font-bold text-slate-300 block">
                  Expository Writing
                </span>
                <span className="text-slate-500 italic mt-0.5 block">
                  Sem 6
                </span>
              </div>
              <div className="bg-slate-900/30 p-2 rounded-lg border border-slate-800/50 md:col-span-2">
                <span className="font-bold text-indigo-400 block">
                  Social Science Electives
                </span>
                <span className="text-slate-400 text-[11px] block mt-0.5">
                  Marketing, Economy, Organizational Behaviour, Legal Systems.
                </span>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-slate-900">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500 uppercase tracking-widest font-semibold">
              Focus Area:
            </span>
            <span className="text-slate-400 font-bold bg-slate-900/80 border border-slate-800 px-2.5 py-0.5 rounded-full">
              Non-Technical Breadth
            </span>
          </div>
        </div>
      </div>
    </div>
  </main>
  {/* Subject Detail Modal / Popup Drawer */}
  <div
    id="subject-modal"
    className="fixed inset-0 bg-slate-950/80 backdrop-blur-md hidden items-center justify-center z-50 p-4 transition-all duration-300"
  >
    <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative">
      <button
        onclick="closeSubjectDetail()"
        className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 p-1.5 rounded-lg transition-colors"
      >
        <i data-lucide="x" className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-3 mb-2">
        <span
          className="px-2 py-0.5 text-[10px] font-bold tracking-widest bg-indigo-950 border border-indigo-900 text-indigo-400 rounded-full uppercase"
          id="modal-category"
        >
          Core Tech
        </span>
        <span className="text-slate-500 text-xs" id="modal-semester">
          Semester 3
        </span>
      </div>
      <h3 className="text-xl font-bold text-white mb-2" id="modal-title">
        Subject Title
      </h3>
      <div
        className="text-slate-400 text-sm mb-6 leading-relaxed"
        id="modal-desc"
      >
        Detailed descriptions of what you actually study here.
      </div>
      {/* Math block if applicable */}
      <div
        id="modal-math-container"
        className="bg-indigo-950/20 rounded-xl p-4 border border-indigo-900/50 mb-6 hidden"
      >
        <div className="text-xs text-indigo-400 uppercase tracking-wider font-bold mb-1">
          Core Formula / Math Concept
        </div>
        <div
          className="text-slate-300 font-serif text-center py-2 text-lg"
          id="modal-math-formula"
        >
          $$A\vec{"{"}x{"}"} = \lambda\vec{"{"}x{"}"}$$
        </div>
      </div>
      {/* Syllabus Targets / Mind map details */}
      <div className="space-y-4">
        <div>
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Key Topics You Must Grip
          </h4>
          <ul
            className="text-slate-300 text-xs space-y-1.5 list-disc pl-4"
            id="modal-topics"
          >
            <li>Topic 1</li>
            <li>Topic 2</li>
          </ul>
        </div>
        <div className="pt-4 border-t border-slate-800">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Recommended Free Learning Resource
          </h4>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
            <div>
              <span
                className="text-xs font-bold text-slate-200 block"
                id="modal-resource-name"
              >
                MIT OpenCourseWare (18.06)
              </span>
              <span
                className="text-[10px] text-slate-500 block"
                id="modal-resource-type"
              >
                Video Lectures &amp; Exams
              </span>
            </div>
            <span className="px-2.5 py-1 bg-indigo-900/40 text-indigo-400 text-[10px] font-bold rounded-lg border border-indigo-900/30 uppercase tracking-wider">
              High Quality
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</>
