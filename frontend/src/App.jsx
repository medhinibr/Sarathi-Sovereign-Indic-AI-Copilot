import React, { useState, useRef, useEffect } from "react";
import { 
  BookOpen, 
  Stethoscope, 
  Upload, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  HelpCircle,
  Activity,
  Globe
} from "lucide-react";

// Determine API base URL dynamically based on environment configuration
const API_URL = import.meta.env.VITE_API_URL || "";

// Supported Indic languages for target translation
const LANGUAGES = [
  { code: "English", label: "English" },
  { code: "Kannada", label: "ಕನ್ನಡ (Kannada)" },
  { code: "Hindi", label: "हिन्दी (Hindi)" },
  { code: "Tamil", label: "தமிழ் (Tamil)" },
  { code: "Telugu", label: "తెలుగు (Telugu)" },
  { code: "Malayalam", label: "മലയാളം (Malayalam)" },
  { code: "Marathi", label: "मराठी (Marathi)" },
  { code: "Gujarati", label: "ગુજરાતી (Gujarati)" },
  { code: "Bengali", label: "বাংলা (Bengali)" },
  { code: "Punjabi", label: "ਪੰਜਾਬੀ (Punjabi)" },
  { code: "Odia", label: "ଓଡ଼ିଆ (Odia)" }
];

// Context-aware suggestion prompts for quick testing
const SUGGESTIONS = {
  education: [
    "Explain the solar system using a cricket match analogy.",
    "What is photosynthesis in simple terms?",
    "How does electricity flow through a wire?"
  ],
  healthcare: [
    "Explain what high cholesterol means for my daily diet.",
    "Simplify a clinical report showing mild hypertension.",
    "What precautions should be taken for type 2 diabetes?"
  ]
};

function App() {
  // App states
  const [mode, setMode] = useState("education"); // 'education' or 'healthcare'
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [shikshaMessages, setShikshaMessages] = useState([]);
  const [arogyaMessages, setArogyaMessages] = useState([]);
  const messages = mode === "education" ? shikshaMessages : arogyaMessages;
  const setMessages = (val) => {
    if (mode === "education") {
      setShikshaMessages(val);
    } else {
      setArogyaMessages(val);
    }
  };
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // File upload states
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("idle"); // 'idle' | 'uploading' | 'success' | 'error'
  const [uploadedFilename, setUploadedFilename] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [shikshaSuggestions, setShikshaSuggestions] = useState(null);
  const [arogyaSuggestions, setArogyaSuggestions] = useState(null);

  // Developer metrics and API payload logging states
  const [lastApiPayload, setLastApiPayload] = useState(null);
  const [lastApiResponse, setLastApiResponse] = useState(null);
  const [showDebugConsole, setShowDebugConsole] = useState(false);
  const [apiLatency, setApiLatency] = useState(null);

  // Voice interaction states
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [playingMessageId, setPlayingMessageId] = useState(null);

  // DOM Refs for scroll handling and input triggering
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto-scroll to the bottom of the chat on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Initialize Web Speech API for real-time transcription
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      // Language mapper from selectedLanguage string to BCP-47
      const langMap = {
        "English": "en-IN",
        "Kannada": "kn-IN",
        "Hindi": "hi-IN",
        "Tamil": "ta-IN",
        "Telugu": "te-IN",
        "Malayalam": "ml-IN",
        "Marathi": "mr-IN",
        "Gujarati": "gu-IN",
        "Bengali": "bn-IN",
        "Punjabi": "pa-IN",
        "Odia": "or-IN"
      };

      recognition.lang = langMap[selectedLanguage] || "en-IN";

      recognition.onresult = (event) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInputMessage(transcript);
      };

      recognition.onerror = (e) => {
        console.error("Speech recognition error:", e);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, [selectedLanguage]);

  // Handle PDF file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== "application/pdf") {
        setUploadStatus("error");
        setUploadError("Please upload a PDF file only.");
        return;
      }
      setFile(selectedFile);
      setUploadStatus("idle");
    }
  };

  // Upload PDF to FastAPI's /api/upload endpoint
  const handleUpload = async () => {
    if (!file) return;

    setUploadStatus("uploading");
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("mode", mode);

    const startTime = performance.now();
    setLastApiPayload({
      url: `${API_URL}/api/upload`,
      method: "POST",
      headers: { "Content-Type": "multipart/form-data" },
      body: { file: file.name, size: `${(file.size / 1024).toFixed(1)} KB`, mode }
    });

    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Upload failed");
      }

      const data = await response.json();
      const endTime = performance.now();
      setApiLatency(Math.round(endTime - startTime));
      setLastApiResponse(data);
      
      setUploadStatus("success");
      setUploadedFilename(data.filename);
      if (data.suggestions && data.suggestions.length > 0) {
        if (mode === "education") {
          setShikshaSuggestions(data.suggestions);
        } else {
          setArogyaSuggestions(data.suggestions);
        }
      }
    } catch (err) {
      setUploadStatus("error");
      setUploadError(err.message || "An error occurred during file upload.");
      setLastApiResponse({ error: err.message });
    }
  };

  // Handle message sending
  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputMessage;
    if (!text.trim()) return;

    // Append user message locally
    const userMsg = { id: Date.now(), text, sender: "user" };
    setMessages((prev) => [...prev, userMsg]);
    
    if (!textToSend) setInputMessage(""); // Clear text input if not clicked suggestion
    setIsLoading(true);

    const startTime = performance.now();
    const reqBody = {
      message: text,
      mode: mode,
      language: selectedLanguage
    };
    setLastApiPayload({
      url: `${API_URL}/api/chat`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: reqBody
    });

    try {
      const response = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(reqBody),
      });

      if (!response.ok) {
        throw new Error("Failed to reach server");
      }

      const data = await response.json();
      const endTime = performance.now();
      setApiLatency(Math.round(endTime - startTime));
      setLastApiResponse(data);
      
      const assistantMsg = {
        id: Date.now() + 1,
        text: data.response,
        sender: "assistant"
      };
      
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      const errorMsg = {
        id: Date.now() + 1,
        text: "Error: Unable to get a response from the server. Check your connection and configuration.",
        sender: "system"
      };
      setMessages((prev) => [...prev, errorMsg]);
      setLastApiResponse({ error: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  // Browser Audio Recording for Speech-to-Text (STT)
  const startAudioRecording = async () => {
    if (recognitionRef.current) {
      try {
        setIsRecording(true);
        recognitionRef.current.start();
      } catch (err) {
        console.error("Recognition start error:", err);
      }
    } else {
      // Fallback to legacy audio recorder
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        const chunks = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        recorder.onstop = async () => {
          const audioBlob = new Blob(chunks, { type: "audio/wav" });
          await handleAudioUpload(audioBlob);
        };

        recorder.start();
        setMediaRecorder(recorder);
        setIsRecording(true);
      } catch (err) {
        console.error("Microphone access denied:", err);
        alert("Microphone access denied or device not supported.");
      }
    }
  };

  const stopAudioRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      // Clean up track bindings to release hardware mic
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
    }
  };

  // Sends recorded audio blob to backend /api/stt endpoint (fallback)
  const handleAudioUpload = async (audioBlob) => {
    const formData = new FormData();
    formData.append("file", audioBlob, "recording.wav");

    setIsLoading(true);
    const startTime = performance.now();
    setLastApiPayload({
      url: `${API_URL}/api/stt`,
      method: "POST",
      headers: { "Content-Type": "multipart/form-data" },
      body: { file: "recording.wav", format: "audio/wav", model: "saaras:v3" }
    });

    try {
      const response = await fetch(`${API_URL}/api/stt`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("STT server error");

      const data = await response.json();
      const endTime = performance.now();
      setApiLatency(Math.round(endTime - startTime));
      setLastApiResponse(data);

      // Populate text field with transcribed text and let user edit it (No auto-send)
      if (data.text) {
        setInputMessage(data.text);
      }
    } catch (err) {
      console.error("STT transaction failed:", err);
      setLastApiResponse({ error: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  // TTS audio playback handler
  const playTextToSpeech = async (msgId, text) => {
    setPlayingMessageId(msgId);
    const startTime = performance.now();
    const payloadBody = {
      text: text,
      language: selectedLanguage,
    };
    setLastApiPayload({
      url: `${API_URL}/api/tts`,
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payloadBody
    });

    try {
      const response = await fetch(`${API_URL}/api/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payloadBody),
      });

      if (!response.ok) throw new Error("TTS streaming failed");

      const blob = await response.blob();
      const endTime = performance.now();
      setApiLatency(Math.round(endTime - startTime));
      setLastApiResponse({
        status: 200,
        statusText: "OK",
        contentType: "audio/wav",
        sizeBytes: blob.size,
        model: selectedLanguage === "English" ? "bulbul:v2" : "bulbul:v3",
        speaker: selectedLanguage === "English" ? "anushka" : "meera"
      });

      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        setPlayingMessageId(null);
      };
      
      await audio.play();
    } catch (err) {
      console.error("TTS output playback error:", err);
      setPlayingMessageId(null);
    }
  };

  // Define dynamic themes based on selected mode (Traditional Indian colorways combined with sleek dark modes)
  const theme = {
    bg: "bg-[#FAF7F2]", // Warm Sandalwood background
    text: "text-slate-800",
    sidebarBg: "bg-[#F3EDE2]", // Creamy paper background
    border: "border-[#E5DEC9]", // Traditional gold-slate border
    primary: mode === "education" ? "bg-[#D97706] hover:bg-[#B45309] text-white" : "bg-[#0F766E] hover:bg-[#115E59] text-white", // Saffron vs Forest Emerald
    card: "bg-white border-[#E5DEC9]",
    fab: mode === "education" ? "bg-[#D97706] hover:bg-[#B45309] text-white ring-amber-200" : "bg-[#0F766E] hover:bg-[#115E59] text-white ring-teal-200",
    bubbleUser: "bg-[#1E1B4B] text-white border-[#312E81]", // Deep Indian Indigo
    bubbleBot: "bg-white border-[#E5DEC9] text-slate-800",
    accentText: mode === "education" ? "text-[#D97706]" : "text-[#0F766E]"
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${theme.bg} ${theme.text} font-sans transition-colors duration-300 relative`}>
      {/* Inject custom Google Fonts & styles */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        .indian-title {
          font-family: 'Playfair Display', serif;
        }
        body {
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Sidebar - Control, Ingestion & Developer Diagnostics Panel */}
      <div className={`w-80 flex flex-col border-r ${theme.border} ${theme.sidebarBg} p-6 space-y-5 transition-all duration-300 overflow-y-auto`}>
        
        {/* App Logo and Branding Header */}
        <div className="border-b border-[#E5DEC9] pb-4">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-ping"></span>
            <h1 className="text-2xl font-bold tracking-tight text-[#1E1B4B] flex items-center gap-2">
              Sarathi
            </h1>
          </div>
          <p className="text-[10px] text-amber-800 font-bold uppercase tracking-widest mt-0.5">Sovereign Indic AI Copilot</p>
          <div className="inline-flex items-center gap-1.5 mt-2 px-2.5 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-[9px] font-bold text-indigo-700">
            <span className="w-1 h-1 rounded-full bg-indigo-500"></span>
            Sarvam Open AI APIs Connected
          </div>
        </div>

        {/* PDF Document Ingestion Container */}
        <div className="flex flex-col space-y-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Document Library Context</label>
          <div className={`border border-dashed border-[#C5BDA9] rounded-2xl p-4 flex flex-col justify-between bg-white shadow-sm`}>
            
            {uploadStatus === "success" ? (
              /* Success/Active Document View */
              <div className="flex flex-col items-center justify-center text-center p-2 space-y-3">
                <div className={`p-3 rounded-2xl bg-amber-50 text-amber-700 border border-amber-200 shadow-inner`}>
                  <FileText size={32} />
                </div>
                
                <div className="space-y-1 w-full">
                  <h4 className="text-xs font-bold text-slate-800 break-all max-w-[200px] mx-auto truncate">
                    {uploadedFilename}
                  </h4>
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Strict RAG Context Bind
                  </span>
                </div>

                <button 
                  onClick={() => {
                    setFile(null);
                    setUploadStatus("idle");
                    setUploadedFilename("");
                    if (mode === "education") {
                      setShikshaSuggestions(null);
                    } else {
                      setArogyaSuggestions(null);
                    }
                  }}
                  className="text-[10px] font-bold text-rose-600 hover:text-rose-700 underline underline-offset-4 cursor-pointer pt-1"
                >
                  Remove Document
                </button>
              </div>
            ) : (
              /* Normal Upload Area */
              <div className="space-y-3">
                <div className="flex flex-col items-center justify-center text-center p-2 border border-dashed border-slate-100 rounded-xl bg-slate-50/50">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf"
                    className="hidden"
                  />
                  
                  <Upload 
                    size={28} 
                    className={`mb-2 ${theme.accentText}`} 
                  />
                  
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold text-indigo-700 hover:text-indigo-850 underline underline-offset-4 cursor-pointer"
                  >
                    Choose PDF file
                  </button>
                  
                  {file ? (
                    <span className="text-[10px] text-slate-700 mt-2 font-medium truncate max-w-[160px]">
                      {file.name}
                    </span>
                  ) : (
                    <span className="text-[9px] text-slate-400 mt-1 leading-relaxed">
                      Upload text-chapters or clinical report PDFs
                    </span>
                  )}
                </div>

                {file && (
                  <button
                    onClick={handleUpload}
                    disabled={uploadStatus === "uploading"}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all ${theme.primary} disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm`}
                  >
                    {uploadStatus === "uploading" && <Loader2 size={12} className="animate-spin" />}
                    Ingest & Vectorize
                  </button>
                )}

                {uploadStatus === "error" && (
                  <div className="flex items-start gap-1.5 text-rose-800 bg-rose-50 p-2 rounded-xl border border-rose-200">
                    <AlertCircle size={14} className="mt-0.5 shrink-0 text-rose-600" />
                    <div className="text-[9px] leading-tight">
                      <p className="font-bold">Ingestion Failed</p>
                      <p className="text-slate-500 mt-0.5">{uploadError}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            
          </div>
        </div>

        {/* Developer Diagnostics & API Live Metrics Panel */}
        <div className="flex flex-col space-y-2 border-t border-[#E5DEC9] pt-4">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Developer API Panel</label>
          <div className="bg-white/80 border border-[#E5DEC9] rounded-2xl p-4 space-y-3 text-[11px] shadow-sm">
            
            {/* API Status States */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">STT Engine</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> saaras:v3
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">TTS Engine</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> bulbul:v3
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Vector Index</span>
                <span className="font-bold text-indigo-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> pinecone-e5
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">LLM Mode</span>
                <span className="font-bold text-indigo-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> LLaMA (temp=0)
                </span>
              </div>
            </div>

            {/* Performance Indicators */}
            <div className="border-t border-slate-100 pt-2.5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Last API Latency</span>
                <span className="font-bold text-slate-800">{apiLatency ? `${apiLatency} ms` : "No requests yet"}</span>
              </div>
            </div>

            {/* Debug console trigger */}
            <button
              onClick={() => setShowDebugConsole(true)}
              className="w-full mt-1.5 py-1.5 bg-[#1E1B4B] hover:bg-[#2E2B6B] text-white text-[10px] font-bold rounded-xl shadow-sm transition-all text-center cursor-pointer"
            >
              Open API Request/Response Log
            </button>
          </div>
        </div>

      </div>

      {/* Main Chat Workspace */}
      <div className="flex-1 flex flex-col bg-transparent relative">
        
        {/* Dynamic Mode Header */}
        <header className="h-16 border-b border-[#E5DEC9]/80 px-8 flex items-center justify-between backdrop-blur-md bg-[#FAF7F2]/80 z-10 sticky top-0">
          
          {/* Mode Toggle Selector */}
          <div className="flex items-center gap-1 p-1 bg-[#F3EDE2] rounded-xl border border-[#E5DEC9] shadow-inner">
            <button
              onClick={() => setMode("education")}
              className={`flex items-center justify-center gap-2 px-5 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${
                mode === "education"
                  ? "bg-[#D97706] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              🎓 Shiksha
            </button>
            <button
              onClick={() => setMode("healthcare")}
              className={`flex items-center justify-center gap-2 px-5 py-1.5 text-xs font-bold rounded-lg transition-all duration-300 ${
                mode === "healthcare"
                  ? "bg-[#0F766E] text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-800"
              }`}
            >
              ⚕️ Arogya
            </button>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            {/* Language Selector Dropdown */}
            <div className="flex items-center gap-2 bg-white border border-[#E5DEC9] rounded-xl px-3 py-1.5 shadow-sm">
              <Globe size={14} className="text-slate-500" />
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 cursor-pointer"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Recruiter / Project context badge */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1E1B4B] text-white rounded-xl text-xs font-bold shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
              Sarvam AI Stack Intern Prototype
            </div>
          </div>

        </header>

        {/* Message Feed Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 pb-40 scrollbar-hide">
          {messages.length === 0 ? (
            /* Traditional Premium Welcome Hero Section */
            <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center space-y-6 pt-4">
              
              <div className="space-y-2">
                <h2 className="indian-title text-4xl font-bold tracking-tight text-[#1E1B4B]">
                  Namaste, I am Sarathi.
                </h2>
                <p className="text-base text-slate-600 max-w-lg mx-auto font-medium">
                  Your voice-first, sovereign AI assistant optimized for India's regional environments.
                </p>
              </div>

              {/* Mode Descriptions Cards */}
              <div className="grid grid-cols-2 gap-4 w-full pt-2">
                <div 
                  onClick={() => setMode("education")}
                  className={`p-5 rounded-2xl border-2 text-left cursor-pointer transition-all duration-300 ${
                    mode === "education" ? "bg-amber-50/50 border-[#D97706]" : "bg-white border-[#E5DEC9] opacity-70 hover:opacity-100"
                  }`}
                >
                  <span className="text-2xl">🎓</span>
                  <h4 className="font-bold text-sm text-[#1E1B4B] mt-2">Shiksha Mode</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Rural education helper explaining text chapters with simple village analogies.
                  </p>
                </div>

                <div 
                  onClick={() => setMode("healthcare")}
                  className={`p-5 rounded-2xl border-2 text-left cursor-pointer transition-all duration-300 ${
                    mode === "healthcare" ? "bg-teal-50/50 border-[#0F766E]" : "bg-white border-[#E5DEC9] opacity-70 hover:opacity-100"
                  }`}
                >
                  <span className="text-2xl">⚕️</span>
                  <h4 className="font-bold text-sm text-[#1E1B4B] mt-2">Arogya Mode</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    ASHA healthcare companion translating and clarifying diagnosis reports.
                  </p>
                </div>
              </div>

              {/* Suggested Questions Grid */}
              <div className="w-full space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-left">Suggested Queries</p>
                <div className="grid grid-cols-1 gap-2 w-full">
                  {((mode === "education" ? shikshaSuggestions : arogyaSuggestions) || SUGGESTIONS[mode]).map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(suggestion)}
                      className={`text-left text-xs p-4 rounded-xl border bg-white border-[#E5DEC9] hover:border-indigo-400 hover:shadow transition-all duration-200 text-slate-700 font-bold`}
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {/* Agent Avatar */}
                {msg.sender !== "user" && (
                  <div className={`h-9 w-9 rounded-xl shrink-0 flex items-center justify-center border shadow-sm ${
                    mode === "education" 
                      ? "bg-amber-100 border-[#D97706]/30 text-[#D97706]" 
                      : "bg-teal-100 border-[#0F766E]/30 text-[#0F766E]"
                  }`}>
                    {mode === "education" ? <BookOpen size={16} /> : <Stethoscope size={16} />}
                  </div>
                )}

                {/* Message Bubble */}
                <div className={`max-w-xl rounded-2xl p-4 text-[14px] leading-relaxed border shadow-sm ${
                  msg.sender === "user"
                    ? theme.bubbleUser
                    : msg.sender === "system"
                    ? "bg-rose-50 border-rose-200 text-rose-950"
                    : theme.bubbleBot
                }`}>
                  <p className="whitespace-pre-line">{msg.text}</p>
                  
                  {/* TTS Trigger Control for Assistant responses */}
                  {msg.sender === "assistant" && (
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Regional Speech Output</span>
                      <button
                        onClick={() => playTextToSpeech(msg.id, msg.text)}
                        disabled={playingMessageId !== null}
                        className={`p-1.5 rounded-lg transition-colors hover:bg-slate-100 ${
                          playingMessageId === msg.id 
                            ? "text-[#D97706] animate-pulse" 
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                        title="Synthesize speech audio"
                      >
                        <Volume2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                {/* User Avatar */}
                {msg.sender === "user" && (
                  <div className="h-9 w-9 rounded-xl shrink-0 flex items-center justify-center bg-indigo-100 border border-indigo-200 text-[#1E1B4B] shadow-sm">
                    <FileText size={16} />
                  </div>
                )}
              </div>
            ))
          )}
          
          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className={`h-9 w-9 rounded-xl shrink-0 flex items-center justify-center border animate-pulse ${
                mode === "education" ? "bg-amber-100 border-[#D97706]/30 text-[#D97706]" : "bg-teal-100 border-[#0F766E]/30 text-[#0F766E]"
              }`}>
                {mode === "education" ? <BookOpen size={16} /> : <Stethoscope size={16} />}
              </div>
              <div className={`rounded-2xl p-4 flex items-center gap-3 border shadow-sm bg-white border-[#E5DEC9]`}>
                <Loader2 size={16} className="animate-spin text-slate-400" />
                <span className="text-xs text-slate-500 font-semibold">Running Sarathi pipelines...</span>
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* Input Controls Panel */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#FAF7F2] via-[#FAF7F2]/80 to-transparent flex flex-col items-center pointer-events-none z-20">
          
          {/* Floating Recording Waves */}
          {isRecording && (
            <div className="flex items-center gap-1.5 mb-3 px-4 py-1.5 bg-rose-50 border border-rose-200 rounded-full shadow-md animate-pulse">
              <span className="w-1.5 h-3 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: "100ms" }}></span>
              <span className="w-1.5 h-4.5 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: "200ms" }}></span>
              <span className="w-1.5 h-6 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
              <span className="w-1.5 h-4.5 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: "400ms" }}></span>
              <span className="w-1.5 h-3 bg-rose-500 rounded-full animate-bounce" style={{ animationDelay: "500ms" }}></span>
              <span className="text-[10px] font-bold text-rose-700 ml-1.5">Listening Regional Script...</span>
            </div>
          )}

          <div className="w-full max-w-2xl flex items-center gap-3 pointer-events-auto">
            
            {/* Input field wrapper */}
            <div className="flex-1 flex items-center bg-white border border-[#E5DEC9] rounded-2xl shadow p-1.5 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all duration-300">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={
                  isRecording 
                    ? "Transcribing your voice query..." 
                    : `Ask or speak a question related to document...`
                }
                disabled={false}
                className="flex-1 bg-transparent border-0 outline-none px-4 py-3 text-sm text-slate-800 placeholder-slate-400 disabled:opacity-50"
              />

              {/* Text Send Button */}
              <button
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || isLoading || isRecording}
                className={`p-3 rounded-xl transition-all duration-300 ${theme.primary} disabled:opacity-40 flex items-center justify-center shadow`}
              >
                <Send size={16} />
              </button>
            </div>

            {/* Mic Control Button */}
            <button
              onClick={isRecording ? stopAudioRecording : startAudioRecording}
              className={`p-4 rounded-2xl flex items-center justify-center shadow transition-all duration-300 focus:outline-none ${
                isRecording ? "bg-rose-500 text-white animate-pulse" : "bg-[#1E1B4B] hover:bg-[#2E2B6B] text-white"
              }`}
              title={isRecording ? "Stop recording" : "Record voice query"}
            >
              {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          </div>

        </div>

      </div>

      {/* Developer Raw JSON API Log Console Modal */}
      {showDebugConsole && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[80%] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Console Header */}
            <div className="flex justify-between items-center p-4 bg-slate-900/70 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="text-xs font-mono font-bold text-slate-200">Sarathi API Dev Console - Live Payloads</span>
              </div>
              <button
                onClick={() => setShowDebugConsole(false)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
              >
                Close Console
              </button>
            </div>

            {/* Console Log Body */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 font-mono text-[11px]">
              
              {/* Request log block */}
              <div className="space-y-1">
                <div className="text-emerald-400 font-bold uppercase tracking-wider text-[9px]">&gt; LAST OUTGOING REQUEST</div>
                <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-3.5 text-slate-300 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {lastApiPayload ? JSON.stringify(lastApiPayload, null, 2) : "// No requests generated in this session yet."}
                </div>
              </div>

              {/* Response log block */}
              <div className="space-y-1">
                <div className="text-indigo-400 font-bold uppercase tracking-wider text-[9px]">&gt; LAST INCOMING RESPONSE</div>
                <div className="bg-slate-900/40 border border-slate-900 rounded-xl p-3.5 text-slate-300 whitespace-pre-wrap max-h-56 overflow-y-auto">
                  {lastApiResponse ? JSON.stringify(lastApiResponse, null, 2) : "// Awaiting server transaction responses."}
                </div>
              </div>

              {/* Context chunk retrieval indicator */}
              <div className="text-slate-500 text-[10px] leading-relaxed italic border-t border-slate-900 pt-3">
                * Note: The RAG engine translates user queries to English, matches against the multilingual-e5 Pinecone index (k=4 chunks), and forces a strict response Refusal fallback if context is missing.
              </div>

            </div>

          </div>
        </div>
      )}
      
    </div>
  );
}

export default App;
